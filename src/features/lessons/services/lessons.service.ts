import "server-only"

import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  createLessonSchema,
  updateLessonSchema,
  type CreateLessonInput,
  type UpdateLessonInput,
} from "@/features/lessons/schemas"
import type { Lesson } from "@/features/lessons/types"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/database/supabase"

const moduleIdSchema = z.uuid("Invalid module id.")
const lessonIdSchema = z.uuid("Invalid lesson id.")

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

function mapCreateLessonInput(
  moduleId: string,
  input: CreateLessonInput
): Database["public"]["Tables"]["lessons"]["Insert"] {
  return {
    module_id: moduleId,
    title: input.title,
    slug: input.slug,
    description: input.description ?? null,
    sort_order: input.sortOrder ?? 0,
    is_required: input.isRequired ?? true,
    status: input.status ?? "draft",
  }
}

function mapUpdateLessonInput(
  input: UpdateLessonInput
): Database["public"]["Tables"]["lessons"]["Update"] {
  const updates: Database["public"]["Tables"]["lessons"]["Update"] = {}

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

  if (input.isRequired !== undefined) {
    updates.is_required = input.isRequired
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
      "A lesson with this slug already exists for this module."
    )
  }

  if (error.code === "PGRST116") {
    return failure("not_found", "Lesson not found.")
  }

  return failure("provider_error", "Unable to complete the lesson request. Please try again.")
}

export async function listLessons(
  moduleId: string
): Promise<ActionResult<Lesson[]>> {
  const parsedModuleId = moduleIdSchema.safeParse(moduleId)

  if (!parsedModuleId.success) {
    return validationFailure(firstValidationMessage(parsedModuleId.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("module_id", parsedModuleId.data)
      .order("sort_order", { ascending: true })

    if (error) {
      return mapDatabaseError(error)
    }

    return success(data ?? [])
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function getLesson(id: string): Promise<ActionResult<Lesson>> {
  const parsedId = lessonIdSchema.safeParse(id)

  if (!parsedId.success) {
    return validationFailure(firstValidationMessage(parsedId.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", parsedId.data)
      .maybeSingle()

    if (error) {
      return mapDatabaseError(error)
    }

    if (!data) {
      return failure("not_found", "Lesson not found.")
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function createLesson(
  moduleId: string,
  input: CreateLessonInput
): Promise<ActionResult<Lesson>> {
  const parsedModuleId = moduleIdSchema.safeParse(moduleId)

  if (!parsedModuleId.success) {
    return validationFailure(firstValidationMessage(parsedModuleId.error))
  }

  const parsed = createLessonSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("lessons")
      .insert(mapCreateLessonInput(parsedModuleId.data, parsed.data))
      .select("*")
      .single()

    if (error || !data) {
      return error
        ? mapDatabaseError(error)
        : failure("provider_error", "Unable to create lesson.")
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function updateLesson(
  id: string,
  input: UpdateLessonInput
): Promise<ActionResult<Lesson>> {
  const parsedId = lessonIdSchema.safeParse(id)

  if (!parsedId.success) {
    return validationFailure(firstValidationMessage(parsedId.error))
  }

  const parsed = updateLessonSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("lessons")
      .update(mapUpdateLessonInput(parsed.data))
      .eq("id", parsedId.data)
      .select("*")
      .single()

    if (error || !data) {
      return error ? mapDatabaseError(error) : failure("not_found", "Lesson not found.")
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function archiveLesson(id: string): Promise<ActionResult<Lesson>> {
  const parsedId = lessonIdSchema.safeParse(id)

  if (!parsedId.success) {
    return validationFailure(firstValidationMessage(parsedId.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("lessons")
      .update({ status: "archived" })
      .eq("id", parsedId.data)
      .select("*")
      .single()

    if (error || !data) {
      return error ? mapDatabaseError(error) : failure("not_found", "Lesson not found.")
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}
