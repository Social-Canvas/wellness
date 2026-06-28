"use server"

import { revalidatePath } from "next/cache"

import { getCurrentProfile } from "@/features/auth/services/auth.service"
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
import {
  calculateCourseProgress,
  getVideoProgress,
  markVideoComplete,
  saveVideoProgress,
} from "@/features/progress/services/progress.service"
import type { CourseProgress, VideoProgress } from "@/features/progress/types"
import { createClient } from "@/lib/supabase/server"

async function requireProfileId(): Promise<ActionResult<string>> {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    return profileResult
  }

  return { success: true, data: profileResult.data.id }
}

function revalidateProgressPaths(courseId: string, lessonId: string) {
  revalidatePath(`/dashboard/library/${courseId}`)
  revalidatePath(`/dashboard/library/${courseId}/lesson/${lessonId}`)
}

async function getCourseIdFromLesson(lessonId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("lessons")
    .select("modules ( course_id )")
    .eq("id", lessonId)
    .maybeSingle()

  return data?.modules?.course_id ?? null
}

export async function saveVideoProgressAction(
  input: SaveVideoProgressInput
): Promise<ActionResult<VideoProgress>> {
  const profileResult = await requireProfileId()

  if (!profileResult.success) {
    return profileResult
  }

  const parsed = saveVideoProgressSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    }
  }

  const result = await saveVideoProgress(profileResult.data, parsed.data)

  if (result.success) {
    const courseId = await getCourseIdFromLesson(parsed.data.lessonId)

    if (courseId) {
      revalidateProgressPaths(courseId, parsed.data.lessonId)
    }
  }

  return result
}

export async function getVideoProgressAction(
  input: GetVideoProgressInput
): Promise<ActionResult<VideoProgress | null>> {
  const profileResult = await requireProfileId()

  if (!profileResult.success) {
    return profileResult
  }

  const parsed = getVideoProgressSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    }
  }

  return getVideoProgress(profileResult.data, parsed.data)
}

export async function markVideoCompleteAction(
  input: MarkVideoCompleteInput
): Promise<ActionResult<VideoProgress>> {
  const profileResult = await requireProfileId()

  if (!profileResult.success) {
    return profileResult
  }

  const parsed = markVideoCompleteSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    }
  }

  const result = await markVideoComplete(profileResult.data, parsed.data)

  if (result.success) {
    const courseId = await getCourseIdFromLesson(parsed.data.lessonId)

    if (courseId) {
      revalidateProgressPaths(courseId, parsed.data.lessonId)
    }
  }

  return result
}

export async function calculateCourseProgressAction(
  input: CalculateCourseProgressInput
): Promise<ActionResult<CourseProgress>> {
  const profileResult = await requireProfileId()

  if (!profileResult.success) {
    return profileResult
  }

  const parsed = calculateCourseProgressSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    }
  }

  return calculateCourseProgress(profileResult.data, parsed.data)
}
