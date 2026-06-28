import "server-only"

import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import type {
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
import { createClient } from "@/lib/supabase/server"
import {
  canAccessCourse,
  canAccessLesson,
} from "@/server/services/entitlement.service"

const userIdSchema = z.uuid("Invalid user id.")
const courseIdSchema = z.uuid("Invalid course id.")
const lessonIdSchema = z.uuid("Invalid lesson id.")

type VideoSummaryRow = Pick<
  Video,
  "id" | "title" | "duration_seconds" | "thumbnail_url" | "mux_playback_id"
>

type LessonWithVideo = Pick<
  Lesson,
  "id" | "module_id" | "title" | "slug" | "sort_order" | "is_required" | "video_id"
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

function mapLibraryLesson(lesson: LessonWithVideo): LibraryLesson {
  const video = normalizeVideoRow(lesson.videos)

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
    lessons,
  }
}

async function filterEntitledLessons(
  userId: string,
  lessons: LessonWithVideo[]
): Promise<ActionResult<LibraryLesson[]>> {
  const entitledLessons: LibraryLesson[] = []

  for (const lesson of lessons) {
    const accessResult = await canAccessLesson(userId, lesson.id)

    if (!accessResult.success) {
      return accessResult
    }

    if (accessResult.data) {
      entitledLessons.push(mapLibraryLesson(lesson))
    }
  }

  return success(entitledLessons)
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

    const accessibleCourses: LibraryCourse[] = []

    for (const course of data ?? []) {
      const accessResult = await canAccessCourse(parsedUserId.data, course.id)

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
  courseId: string
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

  try {
    const supabase = await createClient()

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
      .eq("status", "published")
      .order("sort_order", { ascending: true })

    if (modulesError) {
      return mapDatabaseError(modulesError)
    }

    const moduleRows = modules ?? []

    if (moduleRows.length === 0) {
      return success({
        ...mapLibraryCourse(course),
        modules: [],
      })
    }

    const moduleIds = moduleRows.map((module) => module.id)

    const { data: lessons, error: lessonsError } = await supabase
      .from("lessons")
      .select(
        "id, module_id, title, slug, sort_order, is_required, video_id, videos(id, title, duration_seconds, thumbnail_url, mux_playback_id)"
      )
      .in("module_id", moduleIds)
      .eq("status", "published")
      .order("sort_order", { ascending: true })

    if (lessonsError) {
      return mapDatabaseError(lessonsError)
    }

    const lessonsByModuleId = new Map<string, LibraryLesson[]>()

    for (const moduleRow of moduleRows) {
      const moduleLessons = ((lessons ?? []) as LessonWithVideo[]).filter(
        (lesson) => lesson.module_id === moduleRow.id
      )
      const entitledLessonsResult = await filterEntitledLessons(
        parsedUserId.data,
        moduleLessons
      )

      if (!entitledLessonsResult.success) {
        return entitledLessonsResult
      }

      lessonsByModuleId.set(moduleRow.id, entitledLessonsResult.data)
    }

    return success({
      ...mapLibraryCourse(course),
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
> & {
  videos: VideoSummaryRow | VideoSummaryRow[] | null
  modules: (Pick<Module, "id" | "title" | "slug" | "course_id" | "status"> & {
    courses: Pick<Course, "id" | "title" | "slug" | "status"> | null
  }) | null
}

export async function getAccessibleLesson(
  userId: string,
  courseId: string,
  lessonId: string
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
      .eq("status", "published")
      .maybeSingle()

    if (error) {
      return mapDatabaseError(error)
    }

    if (!data) {
      return failure("not_found", "Lesson not found.")
    }

    const lesson = data as LessonDetailRow
    const lessonModule = lesson.modules

    if (
      !lessonModule ||
      lessonModule.course_id !== parsedCourseId.data ||
      lessonModule.status !== "published" ||
      lessonModule.courses?.status !== "published"
    ) {
      return failure("not_found", "Lesson not found.")
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
      video: mapLibraryVideo(normalizeVideoRow(lesson.videos)),
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
