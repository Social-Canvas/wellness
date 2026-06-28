import "server-only"

import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  createCourseSchema,
  updateCourseSchema,
  type CreateCourseInput,
  type UpdateCourseInput,
} from "@/features/courses/schemas"
import type {
  Course,
  CoursePlanAccess,
  CourseWithPlanAccess,
} from "@/features/courses/types"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/database/supabase"

const courseIdSchema = z.uuid("Invalid course id.")

type ContentAccessWithPlan = Database["public"]["Tables"]["content_access"]["Row"] & {
  plans: Pick<
    Database["public"]["Tables"]["plans"]["Row"],
    "id" | "name" | "slug"
  > | null
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

function mapPlanAccessRow(row: ContentAccessWithPlan): CoursePlanAccess | null {
  if (!row.plans) {
    return null
  }

  return {
    id: row.id,
    planId: row.plan_id,
    planName: row.plans.name,
    planSlug: row.plans.slug,
    createdAt: row.created_at,
  }
}

function mapCourseWithPlanAccess(
  course: Course,
  accessRows: ContentAccessWithPlan[]
): CourseWithPlanAccess {
  return {
    ...course,
    planAccess: accessRows
      .map(mapPlanAccessRow)
      .filter((row): row is CoursePlanAccess => row !== null),
  }
}

function mapCreateCourseInput(
  input: CreateCourseInput
): Database["public"]["Tables"]["courses"]["Insert"] {
  return {
    title: input.title,
    slug: input.slug,
    description: input.description ?? null,
    thumbnail_url: input.thumbnailUrl ?? null,
    certificate_enabled: input.certificateEnabled ?? false,
    completion_threshold: input.completionThreshold ?? 90,
    sort_order: input.sortOrder ?? 0,
    status: input.status ?? "draft",
  }
}

function mapUpdateCourseInput(
  input: UpdateCourseInput
): Database["public"]["Tables"]["courses"]["Update"] {
  const updates: Database["public"]["Tables"]["courses"]["Update"] = {}

  if (input.title !== undefined) {
    updates.title = input.title
  }

  if (input.slug !== undefined) {
    updates.slug = input.slug
  }

  if (input.description !== undefined) {
    updates.description = input.description
  }

  if (input.thumbnailUrl !== undefined) {
    updates.thumbnail_url = input.thumbnailUrl
  }

  if (input.certificateEnabled !== undefined) {
    updates.certificate_enabled = input.certificateEnabled
  }

  if (input.completionThreshold !== undefined) {
    updates.completion_threshold = input.completionThreshold
  }

  if (input.sortOrder !== undefined) {
    updates.sort_order = input.sortOrder
  }

  if (input.status !== undefined) {
    updates.status = input.status
  }

  return updates
}

function mapDatabaseError(error: { code?: string; message: string }): ActionResult<never> {
  if (error.code === "23505") {
    return failure("validation_error", "A course with this slug already exists.")
  }

  if (error.code === "PGRST116") {
    return failure("not_found", "Course not found.")
  }

  return failure("provider_error", "Unable to complete the course request. Please try again.")
}

async function fetchPlanAccessByCourseIds(
  courseIds: string[]
): Promise<Map<string, ContentAccessWithPlan[]>> {
  const accessByCourseId = new Map<string, ContentAccessWithPlan[]>()

  if (courseIds.length === 0) {
    return accessByCourseId
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("content_access")
    .select("id, plan_id, content_id, content_type, created_at, plans(id, name, slug)")
    .eq("content_type", "course")
    .in("content_id", courseIds)

  if (error || !data) {
    return accessByCourseId
  }

  for (const row of data as ContentAccessWithPlan[]) {
    const existing = accessByCourseId.get(row.content_id) ?? []
    existing.push(row)
    accessByCourseId.set(row.content_id, existing)
  }

  return accessByCourseId
}

export async function listCourses(): Promise<ActionResult<CourseWithPlanAccess[]>> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("sort_order", { ascending: true })

    if (error) {
      return mapDatabaseError(error)
    }

    const courses = data ?? []
    const accessByCourseId = await fetchPlanAccessByCourseIds(
      courses.map((course) => course.id)
    )

    return success(
      courses.map((course) =>
        mapCourseWithPlanAccess(course, accessByCourseId.get(course.id) ?? [])
      )
    )
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function getCourse(id: string): Promise<ActionResult<CourseWithPlanAccess>> {
  const parsedId = courseIdSchema.safeParse(id)

  if (!parsedId.success) {
    return validationFailure(firstValidationMessage(parsedId.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("id", parsedId.data)
      .maybeSingle()

    if (error) {
      return mapDatabaseError(error)
    }

    if (!data) {
      return failure("not_found", "Course not found.")
    }

    const accessByCourseId = await fetchPlanAccessByCourseIds([data.id])

    return success(mapCourseWithPlanAccess(data, accessByCourseId.get(data.id) ?? []))
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function createCourse(
  input: CreateCourseInput
): Promise<ActionResult<Course>> {
  const parsed = createCourseSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("courses")
      .insert(mapCreateCourseInput(parsed.data))
      .select("*")
      .single()

    if (error || !data) {
      return error
        ? mapDatabaseError(error)
        : failure("provider_error", "Unable to create course.")
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function updateCourse(
  id: string,
  input: UpdateCourseInput
): Promise<ActionResult<Course>> {
  const parsedId = courseIdSchema.safeParse(id)

  if (!parsedId.success) {
    return validationFailure(firstValidationMessage(parsedId.error))
  }

  const parsed = updateCourseSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("courses")
      .update(mapUpdateCourseInput(parsed.data))
      .eq("id", parsedId.data)
      .select("*")
      .single()

    if (error || !data) {
      return error ? mapDatabaseError(error) : failure("not_found", "Course not found.")
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function archiveCourse(id: string): Promise<ActionResult<Course>> {
  const parsedId = courseIdSchema.safeParse(id)

  if (!parsedId.success) {
    return validationFailure(firstValidationMessage(parsedId.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("courses")
      .update({ status: "archived" })
      .eq("id", parsedId.data)
      .select("*")
      .single()

    if (error || !data) {
      return error ? mapDatabaseError(error) : failure("not_found", "Course not found.")
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}
