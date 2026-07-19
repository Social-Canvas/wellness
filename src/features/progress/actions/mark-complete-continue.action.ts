"use server"

import { redirect } from "next/navigation"

import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { getAccessibleCourse } from "@/features/content/services/content.service"
import {
  buildLessonNavigation,
  resolveContinueDestination,
} from "@/features/content/utils/lesson-navigation"
import { markCompleteAndContinueSchema } from "@/features/progress/schemas/mark-complete-and-continue"
import { markVideoComplete } from "@/features/progress/services/progress.service"
import { revalidatePath } from "next/cache"

export type MarkCompleteContinueState =
  | { status: "idle" }
  | { status: "error"; message: string }

function formString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key)
  return typeof value === "string" ? value : undefined
}

/**
 * Marks the current lesson complete and redirects to the server-derived next
 * available lesson (or course overview). Never trusts a client next-lesson id.
 */
export async function markCompleteAndContinueAction(
  _prev: MarkCompleteContinueState,
  formData: FormData
): Promise<MarkCompleteContinueState> {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    return { status: "error", message: "Please sign in to continue." }
  }

  const parsed = markCompleteAndContinueSchema.safeParse({
    courseId: formString(formData, "courseId"),
    lessonId: formString(formData, "lessonId"),
    videoId: formString(formData, "videoId"),
    preview: formString(formData, "preview"),
  })

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    }
  }

  // Explicitly ignore any client-supplied next destination fields.
  const ignoredNext = formString(formData, "nextLessonId")
  if (ignoredNext) {
    // Still continue with server-derived destination; do not use the value.
  }

  const { courseId, lessonId, videoId, preview } = parsed.data
  const previewRequested = preview === "1"

  const completeResult = await markVideoComplete(profileResult.data.id, {
    videoId,
    lessonId,
  })

  if (!completeResult.success) {
    return {
      status: "error",
      message: completeResult.error.message,
    }
  }

  const courseResult = await getAccessibleCourse(profileResult.data.id, courseId, {
    preview: {
      requested: previewRequested,
      role: profileResult.data.role,
    },
  })

  if (!courseResult.success) {
    return { status: "error", message: courseResult.error.message }
  }

  // Destination uses authorized preview flag from the course result, not the
  // raw query string alone.
  const navigation = buildLessonNavigation(courseResult.data.modules, lessonId)
  const destination = resolveContinueDestination({
    courseId,
    preview: courseResult.data.preview,
    next: navigation.next,
  })

  revalidatePath(`/dashboard/library/${courseId}`)
  revalidatePath(`/dashboard/library/${courseId}/lesson/${lessonId}`)

  redirect(destination)
}
