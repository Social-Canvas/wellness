import "server-only"

import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  calculateCourseProgressSchema,
  getVideoProgressSchema,
  markVideoCompleteSchema,
  saveVideoProgressSchema,
  type CalculateCourseProgressInput,
  type GetVideoProgressInput,
  type MarkVideoCompleteInput,
  type SaveVideoProgressInput,
} from "@/features/progress/schemas"
import type { CourseProgress, VideoProgress } from "@/features/progress/types"
import { createClient } from "@/lib/supabase/server"
import { canAccessCourse, canAccessVideo } from "@/server/services/entitlement.service"
import type { Database } from "@/types/database/supabase"

const userIdSchema = z.uuid("Invalid user id.")
const DEFAULT_COMPLETION_THRESHOLD = 90

type VideoProgressRow = Database["public"]["Tables"]["video_progress"]["Row"]

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
    return failure("not_found", "Progress not found.")
  }

  return failure("provider_error", "Unable to save progress. Please try again.")
}

function mapVideoProgress(row: VideoProgressRow): VideoProgress {
  return {
    videoId: row.video_id,
    lessonId: row.lesson_id,
    lastPositionSeconds: row.last_position_seconds,
    watchedSeconds: row.watched_seconds,
    progressPercentage: row.progress_percentage,
    completedAt: row.completed_at,
  }
}

function calculateProgressPercentage(
  positionSeconds: number,
  durationSeconds: number
): number {
  if (durationSeconds <= 0) {
    return 0
  }

  return Math.min(100, Math.round((positionSeconds / durationSeconds) * 100))
}

async function getCompletionThresholdForLesson(
  lessonId: string
): Promise<ActionResult<number>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("lessons")
      .select("modules ( courses ( completion_threshold ) )")
      .eq("id", lessonId)
      .maybeSingle()

    if (error) {
      return mapDatabaseError(error)
    }

    if (!data?.modules?.courses) {
      return success(DEFAULT_COMPLETION_THRESHOLD)
    }

    return success(data.modules.courses.completion_threshold ?? DEFAULT_COMPLETION_THRESHOLD)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

async function getCourseIdForLesson(lessonId: string): Promise<ActionResult<string>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("lessons")
      .select("modules ( course_id )")
      .eq("id", lessonId)
      .maybeSingle()

    if (error) {
      return mapDatabaseError(error)
    }

    const courseId = data?.modules?.course_id

    if (!courseId) {
      return failure("not_found", "Lesson not found.")
    }

    return success(courseId)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

async function verifyLessonVideoLink(
  lessonId: string,
  videoId: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("lessons")
      .select("video_id")
      .eq("id", lessonId)
      .maybeSingle()

    if (error) {
      return mapDatabaseError(error)
    }

    if (!data || data.video_id !== videoId) {
      return failure("validation_error", "Video does not match this lesson.")
    }

    return success(undefined)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function getVideoProgress(
  userId: string,
  input: GetVideoProgressInput
): Promise<ActionResult<VideoProgress | null>> {
  const parsedUserId = userIdSchema.safeParse(userId)
  const parsedInput = getVideoProgressSchema.safeParse(input)

  if (!parsedUserId.success) {
    return validationFailure(firstValidationMessage(parsedUserId.error))
  }

  if (!parsedInput.success) {
    return validationFailure(firstValidationMessage(parsedInput.error))
  }

  const accessResult = await canAccessVideo(parsedUserId.data, parsedInput.data.videoId)

  if (!accessResult.success) {
    return accessResult
  }

  if (!accessResult.data) {
    return failure("entitlement_required", "You do not have access to this video.")
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("video_progress")
      .select("*")
      .eq("user_id", parsedUserId.data)
      .eq("video_id", parsedInput.data.videoId)
      .maybeSingle()

    if (error) {
      return mapDatabaseError(error)
    }

    if (!data) {
      return success(null)
    }

    return success(mapVideoProgress(data))
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function getVideoProgressByVideoIds(
  userId: string,
  videoIds: string[]
): Promise<ActionResult<Record<string, VideoProgress>>> {
  const parsedUserId = userIdSchema.safeParse(userId)

  if (!parsedUserId.success) {
    return validationFailure(firstValidationMessage(parsedUserId.error))
  }

  const uniqueVideoIds = [...new Set(videoIds.filter(Boolean))]

  if (uniqueVideoIds.length === 0) {
    return success({})
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("video_progress")
      .select("*")
      .eq("user_id", parsedUserId.data)
      .in("video_id", uniqueVideoIds)

    if (error) {
      return mapDatabaseError(error)
    }

    const progressByVideoId: Record<string, VideoProgress> = {}

    for (const row of data ?? []) {
      progressByVideoId[row.video_id] = mapVideoProgress(row)
    }

    return success(progressByVideoId)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function saveVideoProgress(
  userId: string,
  input: SaveVideoProgressInput
): Promise<ActionResult<VideoProgress>> {
  const parsedUserId = userIdSchema.safeParse(userId)
  const parsedInput = saveVideoProgressSchema.safeParse(input)

  if (!parsedUserId.success) {
    return validationFailure(firstValidationMessage(parsedUserId.error))
  }

  if (!parsedInput.success) {
    return validationFailure(firstValidationMessage(parsedInput.error))
  }

  const { videoId, lessonId, positionSeconds, durationSeconds } = parsedInput.data

  const accessResult = await canAccessVideo(parsedUserId.data, videoId)

  if (!accessResult.success) {
    return accessResult
  }

  if (!accessResult.data) {
    return failure("entitlement_required", "You do not have access to this video.")
  }

  const lessonLinkResult = await verifyLessonVideoLink(lessonId, videoId)

  if (!lessonLinkResult.success) {
    return lessonLinkResult
  }

  const thresholdResult = await getCompletionThresholdForLesson(lessonId)

  if (!thresholdResult.success) {
    return thresholdResult
  }

  const courseIdResult = await getCourseIdForLesson(lessonId)

  if (!courseIdResult.success) {
    return courseIdResult
  }

  const progressPercentage = calculateProgressPercentage(positionSeconds, durationSeconds)
  const shouldComplete = progressPercentage >= thresholdResult.data

  try {
    const supabase = await createClient()

    const { data: existing, error: existingError } = await supabase
      .from("video_progress")
      .select("*")
      .eq("user_id", parsedUserId.data)
      .eq("video_id", videoId)
      .maybeSingle()

    if (existingError) {
      return mapDatabaseError(existingError)
    }

    const watchedSeconds = Math.max(existing?.watched_seconds ?? 0, positionSeconds)
    const completedAt =
      existing?.completed_at ??
      (shouldComplete ? new Date().toISOString() : null)
    const storedPercentage =
      completedAt !== null ? 100 : Math.max(existing?.progress_percentage ?? 0, progressPercentage)

    const { data, error } = await supabase
      .from("video_progress")
      .upsert(
        {
          user_id: parsedUserId.data,
          video_id: videoId,
          lesson_id: lessonId,
          last_position_seconds: positionSeconds,
          watched_seconds: watchedSeconds,
          progress_percentage: storedPercentage,
          completed_at: completedAt,
        },
        { onConflict: "user_id,video_id" }
      )
      .select("*")
      .single()

    if (error) {
      return mapDatabaseError(error)
    }

    if (completedAt && !existing?.completed_at) {
      const courseProgressResult = await calculateCourseProgress(parsedUserId.data, {
        courseId: courseIdResult.data,
      })

      if (!courseProgressResult.success) {
        return courseProgressResult
      }
    }

    return success(mapVideoProgress(data))
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function markVideoComplete(
  userId: string,
  input: MarkVideoCompleteInput
): Promise<ActionResult<VideoProgress>> {
  const parsedUserId = userIdSchema.safeParse(userId)
  const parsedInput = markVideoCompleteSchema.safeParse(input)

  if (!parsedUserId.success) {
    return validationFailure(firstValidationMessage(parsedUserId.error))
  }

  if (!parsedInput.success) {
    return validationFailure(firstValidationMessage(parsedInput.error))
  }

  const { videoId, lessonId } = parsedInput.data

  const accessResult = await canAccessVideo(parsedUserId.data, videoId)

  if (!accessResult.success) {
    return accessResult
  }

  if (!accessResult.data) {
    return failure("entitlement_required", "You do not have access to this video.")
  }

  const lessonLinkResult = await verifyLessonVideoLink(lessonId, videoId)

  if (!lessonLinkResult.success) {
    return lessonLinkResult
  }

  const courseIdResult = await getCourseIdForLesson(lessonId)

  if (!courseIdResult.success) {
    return courseIdResult
  }

  try {
    const supabase = await createClient()

    const { data: existing, error: existingError } = await supabase
      .from("video_progress")
      .select("*")
      .eq("user_id", parsedUserId.data)
      .eq("video_id", videoId)
      .maybeSingle()

    if (existingError) {
      return mapDatabaseError(existingError)
    }

    const completedAt = new Date().toISOString()
    const lastPositionSeconds = Math.max(
      existing?.last_position_seconds ?? 0,
      existing?.watched_seconds ?? 0
    )

    const { data, error } = await supabase
      .from("video_progress")
      .upsert(
        {
          user_id: parsedUserId.data,
          video_id: videoId,
          lesson_id: lessonId,
          last_position_seconds: lastPositionSeconds,
          watched_seconds: Math.max(existing?.watched_seconds ?? 0, lastPositionSeconds),
          progress_percentage: 100,
          completed_at: completedAt,
        },
        { onConflict: "user_id,video_id" }
      )
      .select("*")
      .single()

    if (error) {
      return mapDatabaseError(error)
    }

    const courseProgressResult = await calculateCourseProgress(parsedUserId.data, {
      courseId: courseIdResult.data,
    })

    if (!courseProgressResult.success) {
      return courseProgressResult
    }

    return success(mapVideoProgress(data))
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function calculateCourseProgress(
  userId: string,
  input: CalculateCourseProgressInput
): Promise<ActionResult<CourseProgress>> {
  const parsedUserId = userIdSchema.safeParse(userId)
  const parsedInput = calculateCourseProgressSchema.safeParse(input)

  if (!parsedUserId.success) {
    return validationFailure(firstValidationMessage(parsedUserId.error))
  }

  if (!parsedInput.success) {
    return validationFailure(firstValidationMessage(parsedInput.error))
  }

  const accessResult = await canAccessCourse(parsedUserId.data, parsedInput.data.courseId)

  if (!accessResult.success) {
    return accessResult
  }

  if (!accessResult.data) {
    return failure("entitlement_required", "You do not have access to this course.")
  }

  try {
    const supabase = await createClient()

    const { data: modules, error: modulesError } = await supabase
      .from("modules")
      .select("id")
      .eq("course_id", parsedInput.data.courseId)
      .eq("status", "published")

    if (modulesError) {
      return mapDatabaseError(modulesError)
    }

    const moduleIds = (modules ?? []).map((module) => module.id)

    if (moduleIds.length === 0) {
      return upsertCourseProgress(parsedUserId.data, parsedInput.data.courseId, 0, 0)
    }

    const { data: lessons, error: lessonsError } = await supabase
      .from("lessons")
      .select("id, video_id")
      .in("module_id", moduleIds)
      .eq("status", "published")

    if (lessonsError) {
      return mapDatabaseError(lessonsError)
    }

    const lessonRows = lessons ?? []
    const totalLessons = lessonRows.length

    if (totalLessons === 0) {
      return upsertCourseProgress(parsedUserId.data, parsedInput.data.courseId, 0, 0)
    }

    const videoIds = lessonRows
      .map((lesson) => lesson.video_id)
      .filter((videoId): videoId is string => Boolean(videoId))

    let completedVideoIds = new Set<string>()

    if (videoIds.length > 0) {
      const { data: progressRows, error: progressError } = await supabase
        .from("video_progress")
        .select("video_id, completed_at")
        .eq("user_id", parsedUserId.data)
        .in("video_id", videoIds)
        .not("completed_at", "is", null)

      if (progressError) {
        return mapDatabaseError(progressError)
      }

      completedVideoIds = new Set((progressRows ?? []).map((row) => row.video_id))
    }

    const completedLessons = lessonRows.filter((lesson) => {
      if (!lesson.video_id) {
        return true
      }

      return completedVideoIds.has(lesson.video_id)
    }).length

    return upsertCourseProgress(
      parsedUserId.data,
      parsedInput.data.courseId,
      completedLessons,
      totalLessons
    )
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

async function upsertCourseProgress(
  userId: string,
  courseId: string,
  completedLessons: number,
  totalLessons: number
): Promise<ActionResult<CourseProgress>> {
  const progressPercentage =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  const completedAt = progressPercentage === 100 ? new Date().toISOString() : null

  try {
    const supabase = await createClient()

    const { data: existing, error: existingError } = await supabase
      .from("course_progress")
      .select("completed_at")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle()

    if (existingError) {
      return mapDatabaseError(existingError)
    }

    const { data, error } = await supabase
      .from("course_progress")
      .upsert(
        {
          user_id: userId,
          course_id: courseId,
          progress_percentage: progressPercentage,
          completed_lessons: completedLessons,
          total_lessons: totalLessons,
          completed_at: completedAt ?? existing?.completed_at ?? null,
        },
        { onConflict: "user_id,course_id" }
      )
      .select("*")
      .single()

    if (error) {
      return mapDatabaseError(error)
    }

    return success({
      courseId: data.course_id,
      progressPercentage: data.progress_percentage,
      completedLessons: data.completed_lessons,
      totalLessons: data.total_lessons,
      completedAt: data.completed_at,
    })
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}
