import "server-only"

import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  createModuleSchema,
  updateModuleSchema,
  type CreateModuleInput,
  type UpdateModuleInput,
} from "@/features/modules/schemas"
import type { Module } from "@/features/modules/types"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/database/supabase"

const courseIdSchema = z.uuid("Invalid course id.")
const moduleIdSchema = z.uuid("Invalid module id.")

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

function mapCreateModuleInput(
  courseId: string,
  input: CreateModuleInput
): Database["public"]["Tables"]["modules"]["Insert"] {
  return {
    course_id: courseId,
    title: input.title,
    slug: input.slug,
    description: input.description ?? null,
    sort_order: input.sortOrder ?? 0,
    status: input.status ?? "draft",
  }
}

function mapUpdateModuleInput(
  input: UpdateModuleInput
): Database["public"]["Tables"]["modules"]["Update"] {
  const updates: Database["public"]["Tables"]["modules"]["Update"] = {}

  if (input.title !== undefined) {
    updates.title = input.title
  }

  if (input.slug !== undefined) {
    updates.slug = input.slug
  }

  if (input.description !== undefined) {
    updates.description = input.description
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
    return failure(
      "validation_error",
      "A module with this slug already exists for this course."
    )
  }

  if (error.code === "PGRST116") {
    return failure("not_found", "Module not found.")
  }

  return failure("provider_error", "Unable to complete the module request. Please try again.")
}

export async function listModules(
  courseId: string
): Promise<ActionResult<Module[]>> {
  const parsedCourseId = courseIdSchema.safeParse(courseId)

  if (!parsedCourseId.success) {
    return validationFailure(firstValidationMessage(parsedCourseId.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("modules")
      .select("*")
      .eq("course_id", parsedCourseId.data)
      .order("sort_order", { ascending: true })

    if (error) {
      return mapDatabaseError(error)
    }

    return success(data ?? [])
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function getModule(id: string): Promise<ActionResult<Module>> {
  const parsedId = moduleIdSchema.safeParse(id)

  if (!parsedId.success) {
    return validationFailure(firstValidationMessage(parsedId.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("modules")
      .select("*")
      .eq("id", parsedId.data)
      .maybeSingle()

    if (error) {
      return mapDatabaseError(error)
    }

    if (!data) {
      return failure("not_found", "Module not found.")
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function createModule(
  courseId: string,
  input: CreateModuleInput
): Promise<ActionResult<Module>> {
  const parsedCourseId = courseIdSchema.safeParse(courseId)

  if (!parsedCourseId.success) {
    return validationFailure(firstValidationMessage(parsedCourseId.error))
  }

  const parsed = createModuleSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("modules")
      .insert(mapCreateModuleInput(parsedCourseId.data, parsed.data))
      .select("*")
      .single()

    if (error || !data) {
      return error
        ? mapDatabaseError(error)
        : failure("provider_error", "Unable to create module.")
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function updateModule(
  id: string,
  input: UpdateModuleInput
): Promise<ActionResult<Module>> {
  const parsedId = moduleIdSchema.safeParse(id)

  if (!parsedId.success) {
    return validationFailure(firstValidationMessage(parsedId.error))
  }

  const parsed = updateModuleSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("modules")
      .update(mapUpdateModuleInput(parsed.data))
      .eq("id", parsedId.data)
      .select("*")
      .single()

    if (error || !data) {
      return error ? mapDatabaseError(error) : failure("not_found", "Module not found.")
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function archiveModule(id: string): Promise<ActionResult<Module>> {
  const parsedId = moduleIdSchema.safeParse(id)

  if (!parsedId.success) {
    return validationFailure(firstValidationMessage(parsedId.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("modules")
      .update({ status: "archived" })
      .eq("id", parsedId.data)
      .select("*")
      .single()

    if (error || !data) {
      return error ? mapDatabaseError(error) : failure("not_found", "Module not found.")
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}
