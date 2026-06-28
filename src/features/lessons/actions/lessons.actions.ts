"use server"

import { revalidatePath } from "next/cache"

import type { CreateLessonInput, UpdateLessonInput } from "@/features/lessons/schemas"
import {
  archiveLesson,
  createLesson,
  updateLesson,
} from "@/features/lessons/services/lessons.service"
import type { Lesson } from "@/features/lessons/types"
import type { ActionResult } from "@/features/auth/services/auth.service"

function revalidateLessonsPath(courseId: string, moduleId: string) {
  revalidatePath(`/admin/courses/${courseId}/modules/${moduleId}/lessons`)
}

export async function createLessonAction(
  courseId: string,
  moduleId: string,
  input: CreateLessonInput
): Promise<ActionResult<Lesson>> {
  const result = await createLesson(moduleId, input)

  if (!result.success) {
    return result
  }

  revalidateLessonsPath(courseId, moduleId)
  return result
}

export async function updateLessonAction(
  courseId: string,
  moduleId: string,
  id: string,
  input: UpdateLessonInput
): Promise<ActionResult<Lesson>> {
  const result = await updateLesson(id, input)

  if (!result.success) {
    return result
  }

  revalidateLessonsPath(courseId, moduleId)
  return result
}

export async function archiveLessonAction(
  courseId: string,
  moduleId: string,
  id: string
): Promise<ActionResult<Lesson>> {
  const result = await archiveLesson(id)

  if (!result.success) {
    return result
  }

  revalidateLessonsPath(courseId, moduleId)
  return result
}
