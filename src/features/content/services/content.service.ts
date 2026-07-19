import "server-only"

import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import type { UserRole } from "@/features/auth/types"
import type {
  LibraryContentStatus,
  LibraryCourse,
  LibraryCourseDetail,
  LibraryLesson,
  LibraryLessonDetail,
  LibraryModule,
  LibraryVideoSummary,
} from "@/features/content/types"
import type { Course } from "@/features/courses/types"
import type { Lesson } from "@/features/lessons/types"
import type { Module } from "@/features/modules/types"
import type { Video } from "@/features/videos/types"
import {
  getVideoProgress,
  getVideoProgressByVideoIds,
} from "@/features/progress/services/progress.service"
import {
  canAccessCourse,
  canAccessLesson,
  canPreviewDraftContent,
} from "@/server/services/entitlement.service"
import {
  combinePreviewDecision,
  deriveLessonAvailability,
  selectContentStatuses,
} from "@/server/services/preview-eligibility"
import { createClient } from "@/lib/supabase/server"

/** Untrusted preview request intent plus the profile used to authorize it. */
export type PreviewContext = {
  requested: boolean
  role: UserRole
}

/**
 * Resolves whether a draft-content preview is authorized for this request.
 * The `requested` flag (from `?preview=1`) alone never grants preview; the
 * profile must independently satisfy {@link canPreviewDraftContent}. Any error
 * or missing context degrades safely to published-only (no preview).
 */
async function resolvePreviewAuthorized(
  userId: string,
  preview: PreviewContext | undefined
): Promise<boolean> {
  const requested = preview?.requested ?? false

  if (!requested || !preview) {
    return false
  }

  const previewResult = await canPreviewDraftContent({ id: userId, role: preview.role })
  const eligible = previewResult.success && previewResult.data

  return combinePreviewDecision(requested, eligible)
}

const userIdSchema = z.uuid("Invalid user id.")
const courseIdSchema = z.uuid("Invalid course id.")
const lessonIdSchema = z.uuid("Invalid lesson id.")

type VideoSummaryRow = Pick<
  Video,
  "id" | "title" | "duration_seconds" | "thumbnail_url" | "mux_playback_id"
>

type LessonWithVideo = Pick<
  Lesson,
  | "id"
  | "module_id"
  | "title"
  | "slug"
  | "sort_order"
  | "is_required"
  | "video_id"
  | "status"
> & {
  videos: VideoSummaryRow | VideoSummaryRow[] | null
}

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

function validationFailure(message: string): ActionResult<never> {
  return failure("validation_error", message)
}

function firstValidationMessage(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Invalid input."
}

function mapDatabaseError(error: { code?: string; message: string }): ActionResult<never> {
  if (error.code === "PGRST116") {
    return failure("not_found", "Content not found.")
  }

  return failure("provider_error", "Unable to load content. Please try again.")
}

function mapLibraryCourse(course: Course): LibraryCourse {
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    thumbnailUrl: course.thumbnail_url,
    certificateEnabled: course.certificate_enabled,
    sortOrder: course.sort_order,
  }
}

function normalizeVideoRow(
  video: VideoSummaryRow | VideoSummaryRow[] | null | undefined
): VideoSummaryRow | null {
  if (!video) {
    return null
  }

  return Array.isArray(video) ? (video[0] ?? null) : video
}

function mapLibraryVideo(video: VideoSummaryRow | null): LibraryVideoSummary | null {
  if (!video) {
    return null
  }

  return {
    id: video.id,
    title: video.title,
    durationSeconds: video.duration_seconds,
    thumbnailUrl: video.thumbnail_url,
    muxPlaybackId: video.mux_playback_id,
  }
}

function toLibraryStatus(status: string): LibraryContentStatus {
  return status === "draft" ? "draft" : "published"
}

function mapLibraryLesson(
  lesson: LessonWithVideo,
  isCompleted = false
): LibraryLesson {
  const video = normalizeVideoRow(lesson.videos)
  const status = toLibraryStatus(lesson.status)
  const isAvailable = status === "published"

  return {
    id: lesson.id,
    moduleId: lesson.module_id,
    title: lesson.title,
    slug: lesson.slug,
    sortOrder: lesson.sort_order,
    isRequired: lesson.is_required,
    videoId: lesson.video_id,
    hasVideo: Boolean(lesson.video_id && video),
    durationSeconds: video?.duration_seconds ?? null,
    // Draft lessons are never counted as completed in preview.
    isCompleted: isAvailable ? isCompleted : false,
    status,
    isAvailable,
  }
}

function mapLibraryModule(
  module: Module,
  lessons: LibraryLesson[]
): LibraryModule {
  return {
    id: module.id,
    courseId: module.course_id,
    title: module.title,
    slug: module.slug,
    description: module.description,
    sortOrder: module.sort_order,
    status: toLibraryStatus(module.status),
    lessons,
  }
}

/**
 * Maps lessons for a course outline after course entitlement has already been
 * resolved once. Does not call canAccessLesson per lesson (avoids N+1).
 */
function mapCourseOutlineLessons(
  lessons: LessonWithVideo[],
  progressByVideoId: Record<string, { completedAt: string | null }>
): LibraryLesson[] {
  return lessons.map((lesson) => {
    const video = normalizeVideoRow(lesson.videos)
    const isCompleted = video?.id
      ? Boolean(progressByVideoId[video.id]?.completedAt)
      : true

    return mapLibraryLesson(lesson, isCompleted)
  })
}

export async function listAccessibleCourses(
  userId: string
): Promise<ActionResult<LibraryCourse[]>> {
  const parsedUserId = userIdSchema.safeParse(userId)

  if (!parsedUserId.success) {
    return validationFailure(firstValidationMessage(parsedUserId.error))
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("status", "published")
      .order("sort_order", { ascending: true })

    if (error) {
      return mapDatabaseError(error)
    }

    const courses = data ?? []
    const accessResults = await Promise.all(
      courses.map(async (course) => {
        const accessResult = await canAccessCourse(parsedUserId.data, course.id)
        return { course, accessResult }
      })
    )

    const accessibleCourses: LibraryCourse[] = []

    for (const { course, accessResult } of accessResults) {
      if (!accessResult.success) {
        return accessResult
      }

      if (accessResult.data) {
        accessibleCourses.push(mapLibraryCourse(course))
      }
    }

    return success(accessibleCourses)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function getAccessibleCourse(
  userId: string,
  courseId: string,
  options?: { preview?: PreviewContext }
): Promise<ActionResult<LibraryCourseDetail>> {
  const parsedUserId = userIdSchema.safeParse(userId)
  const parsedCourseId = courseIdSchema.safeParse(courseId)

  if (!parsedUserId.success) {
    return validationFailure(firstValidationMessage(parsedUserId.error))
  }

  if (!parsedCourseId.success) {
    return validationFailure(firstValidationMessage(parsedCourseId.error))
  }

  const accessResult = await canAccessCourse(parsedUserId.data, parsedCourseId.data)

  if (!accessResult.success) {
    return accessResult
  }

  if (!accessResult.data) {
    return failure("not_found", "Course not found.")
  }

  // Preview authorization is derived server-side from the profile; the request
  // flag alone can never enable it. Non-entitled users never reach this point.
  const previewAuthorized = await resolvePreviewAuthorized(
    parsedUserId.data,
    options?.preview
  )
  const contentStatuses = selectContentStatuses(previewAuthorized)

  try {
    const supabase = await createClient()

    // The course container itself must always be published; preview only ever
    // exposes draft modules/lessons of an already-entitled, published course.
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("id", parsedCourseId.data)
      .eq("status", "published")
      .maybeSingle()

    if (courseError) {
      return mapDatabaseError(courseError)
    }

    if (!course) {
      return failure("not_found", "Course not found.")
    }

    const { data: modules, error: modulesError } = await supabase
      .from("modules")
      .select("*")
      .eq("course_id", parsedCourseId.data)
      .in("status", contentStatuses)
      .order("sort_order", { ascending: true })

    if (modulesError) {
      return mapDatabaseError(modulesError)
    }

    const moduleRows = modules ?? []

    if (moduleRows.length === 0) {
      return success({
        ...mapLibraryCourse(course),
        preview: previewAuthorized,
        modules: [],
      })
    }

    const moduleIds = moduleRows.map((module) => module.id)

    const { data: lessons, error: lessonsError } = await supabase
      .from("lessons")
      .select(
        "id, module_id, title, slug, sort_order, is_required, video_id, status, videos(id, title, duration_seconds, thumbnail_url, mux_playback_id)"
      )
      .in("module_id", moduleIds)
      .in("status", contentStatuses)
      .order("sort_order", { ascending: true })

    if (lessonsError) {
      return mapDatabaseError(lessonsError)
    }

    const lessonRows = (lessons ?? []) as LessonWithVideo[]
    const videoIds = lessonRows
      .map((lesson) => normalizeVideoRow(lesson.videos)?.id)
      .filter((videoId): videoId is string => Boolean(videoId))

    const progressResult = await getVideoProgressByVideoIds(parsedUserId.data, videoIds)

    if (!progressResult.success) {
      return progressResult
    }

    const progressByVideoId = Object.fromEntries(
      Object.entries(progressResult.data).map(([videoId, progress]) => [
        videoId,
        { completedAt: progress.completedAt },
      ])
    )

    // Course access was already confirmed above. Apply that result to every
    // lesson in the outline — do not re-query entitlement per lesson.
    const lessonsByModuleId = new Map<string, LibraryLesson[]>()

    for (const moduleRow of moduleRows) {
      const moduleLessons = lessonRows.filter(
        (lesson) => lesson.module_id === moduleRow.id
      )
      lessonsByModuleId.set(
        moduleRow.id,
        mapCourseOutlineLessons(moduleLessons, progressByVideoId)
      )
    }

    return success({
      ...mapLibraryCourse(course),
      preview: previewAuthorized,
      modules: moduleRows.map((moduleRow) =>
        mapLibraryModule(moduleRow, lessonsByModuleId.get(moduleRow.id) ?? [])
      ),
    })
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

type LessonDetailRow = Pick<
  Lesson,
  | "id"
  | "module_id"
  | "title"
  | "slug"
  | "description"
  | "sort_order"
  | "is_required"
  | "status"
> & {
  videos: VideoSummaryRow | VideoSummaryRow[] | null
  modules: (Pick<Module, "id" | "title" | "slug" | "course_id" | "status"> & {
    courses: Pick<Course, "id" | "title" | "slug" | "status"> | null
  }) | null
}

export async function getAccessibleLesson(
  userId: string,
  courseId: string,
  lessonId: string,
  options?: { preview?: PreviewContext }
): Promise<ActionResult<LibraryLessonDetail>> {
  const parsedUserId = userIdSchema.safeParse(userId)
  const parsedCourseId = courseIdSchema.safeParse(courseId)
  const parsedLessonId = lessonIdSchema.safeParse(lessonId)

  if (!parsedUserId.success) {
    return validationFailure(firstValidationMessage(parsedUserId.error))
  }

  if (!parsedCourseId.success) {
    return validationFailure(firstValidationMessage(parsedCourseId.error))
  }

  if (!parsedLessonId.success) {
    return validationFailure(firstValidationMessage(parsedLessonId.error))
  }

  const accessResult = await canAccessLesson(parsedUserId.data, parsedLessonId.data)

  if (!accessResult.success) {
    return accessResult
  }

  if (!accessResult.data) {
    return failure("not_found", "Lesson not found.")
  }

  const previewAuthorized = await resolvePreviewAuthorized(
    parsedUserId.data,
    options?.preview
  )
  const lessonStatuses = selectContentStatuses(previewAuthorized)

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("lessons")
      .select(
        `
        id,
        module_id,
        title,
        slug,
        description,
        sort_order,
        is_required,
        status,
        videos ( id, title, duration_seconds, thumbnail_url, mux_playback_id ),
        modules!inner (
          id,
          title,
          slug,
          course_id,
          status,
          courses!inner ( id, title, slug, status )
        )
      `
      )
      .eq("id", parsedLessonId.data)
      .in("status", lessonStatuses)
      .maybeSingle()

    if (error) {
      return mapDatabaseError(error)
    }

    if (!data) {
      return failure("not_found", "Lesson not found.")
    }

    const lesson = data as LessonDetailRow
    const lessonModule = lesson.modules
    const allowedModuleStatuses = selectContentStatuses(previewAuthorized)

    // The course container is always required to be published; modules may be
    // draft only under an authorized preview.
    if (
      !lessonModule ||
      lessonModule.course_id !== parsedCourseId.data ||
      !allowedModuleStatuses.includes(toLibraryStatus(lessonModule.status)) ||
      lessonModule.courses?.status !== "published"
    ) {
      return failure("not_found", "Lesson not found.")
    }

    const lessonStatus = toLibraryStatus(lesson.status)
    const isAvailable = deriveLessonAvailability(lesson.status, lessonModule.status)

    // Draft/unavailable lessons never expose video, playback IDs, progress, or
    // completion — the caller renders a "coming soon" view instead.
    if (!isAvailable) {
      return success({
        id: lesson.id,
        moduleId: lesson.module_id,
        courseId: lessonModule.course_id,
        title: lesson.title,
        slug: lesson.slug,
        description: lesson.description,
        sortOrder: lesson.sort_order,
        isRequired: lesson.is_required,
        video: null,
        videoProgress: null,
        isCompleted: false,
        status: lessonStatus,
        isAvailable: false,
        preview: previewAuthorized,
        course: {
          id: lessonModule.courses.id,
          title: lessonModule.courses.title,
          slug: lessonModule.courses.slug,
        },
        module: {
          id: lessonModule.id,
          title: lessonModule.title,
          slug: lessonModule.slug,
        },
      })
    }

    const video = mapLibraryVideo(normalizeVideoRow(lesson.videos))
    let videoProgress = null
    let isCompleted = !video

    if (video) {
      const progressResult = await getVideoProgress(parsedUserId.data, {
        videoId: video.id,
      })

      if (!progressResult.success) {
        return progressResult
      }

      videoProgress = progressResult.data
      isCompleted = Boolean(progressResult.data?.completedAt)
    }

    return success({
      id: lesson.id,
      moduleId: lesson.module_id,
      courseId: lessonModule.course_id,
      title: lesson.title,
      slug: lesson.slug,
      description: lesson.description,
      sortOrder: lesson.sort_order,
      isRequired: lesson.is_required,
      video,
      videoProgress,
      isCompleted,
      status: lessonStatus,
      isAvailable: true,
      preview: previewAuthorized,
      course: {
        id: lessonModule.courses.id,
        title: lessonModule.courses.title,
        slug: lessonModule.courses.slug,
      },
      module: {
        id: lessonModule.id,
        title: lessonModule.title,
        slug: lessonModule.slug,
      },
    })
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}
