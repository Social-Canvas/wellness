"use server"

import { revalidatePath } from "next/cache"

import type { CreateCourseInput, UpdateCourseInput } from "@/features/courses/schemas"
import {
  archiveCourse,
  createCourse,
  updateCourse,
} from "@/features/courses/services/courses.service"
import type { Course } from "@/features/courses/types"
import type { ActionResult } from "@/features/auth/services/auth.service"
import { requireStaffActor } from "@/server/auth/require-staff"

function revalidateCoursesPath() {
  revalidatePath("/admin/courses")
}

export async function createCourseAction(
  input: CreateCourseInput
): Promise<ActionResult<Course>> {
  const actor = await requireStaffActor()
  if (!actor.success) return actor
  const result = await createCourse(input)

  if (!result.success) {
    return result
  }

  revalidateCoursesPath()
  return result
}

export async function updateCourseAction(
  id: string,
  input: UpdateCourseInput
): Promise<ActionResult<Course>> {
  const actor = await requireStaffActor()
  if (!actor.success) return actor
  const result = await updateCourse(id, input)

  if (!result.success) {
    return result
  }

  revalidateCoursesPath()
  return result
}

export async function archiveCourseAction(
  id: string
): Promise<ActionResult<Course>> {
  const actor = await requireStaffActor()
  if (!actor.success) return actor
  const result = await archiveCourse(id)

  if (!result.success) {
    return result
  }

  revalidateCoursesPath()
  return result
}
