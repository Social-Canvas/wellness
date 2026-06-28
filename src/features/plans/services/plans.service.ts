import "server-only"

import { z } from "zod"

import {
  createPlanSchema,
  updatePlanSchema,
  type CreatePlanInput,
  type UpdatePlanInput,
} from "@/features/plans/schemas"
import type { Plan, PlanPrice, PlanWithPrices } from "@/features/plans/types"
import type { ActionResult } from "@/features/auth/services/auth.service"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/database/supabase"

const planIdSchema = z.uuid("Invalid plan id.")

type PlanRowWithPrices = Plan & {
  plan_prices: PlanPrice[] | null
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

function mapPlanWithPrices(row: PlanRowWithPrices): PlanWithPrices {
  const { plan_prices, ...plan } = row

  return {
    ...plan,
    prices: [...(plan_prices ?? [])].sort((left, right) =>
      left.billing_interval.localeCompare(right.billing_interval)
    ),
  }
}

function mapCreatePlanInput(
  input: CreatePlanInput
): Database["public"]["Tables"]["plans"]["Insert"] {
  return {
    name: input.name,
    slug: input.slug,
    description: input.description ?? null,
    sort_order: input.sortOrder ?? 0,
    is_active: input.isActive ?? true,
  }
}

function mapUpdatePlanInput(
  input: UpdatePlanInput
): Database["public"]["Tables"]["plans"]["Update"] {
  const updates: Database["public"]["Tables"]["plans"]["Update"] = {}

  if (input.name !== undefined) {
    updates.name = input.name
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

  if (input.isActive !== undefined) {
    updates.is_active = input.isActive
  }

  return updates
}

function mapDatabaseError(error: { code?: string; message: string }): ActionResult<never> {
  if (error.code === "23505") {
    return failure("validation_error", "A plan with this slug already exists.")
  }

  if (error.code === "PGRST116") {
    return failure("not_found", "Plan not found.")
  }

  return failure("provider_error", "Unable to complete the plan request. Please try again.")
}

export async function listPlans(): Promise<ActionResult<PlanWithPrices[]>> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("plans")
      .select("*, plan_prices(*)")
      .order("sort_order", { ascending: true })

    if (error) {
      return mapDatabaseError(error)
    }

    return success((data ?? []).map(mapPlanWithPrices))
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function getPlan(id: string): Promise<ActionResult<PlanWithPrices>> {
  const parsedId = planIdSchema.safeParse(id)

  if (!parsedId.success) {
    return validationFailure(firstValidationMessage(parsedId.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("plans")
      .select("*, plan_prices(*)")
      .eq("id", parsedId.data)
      .maybeSingle()

    if (error) {
      return mapDatabaseError(error)
    }

    if (!data) {
      return failure("not_found", "Plan not found.")
    }

    return success(mapPlanWithPrices(data))
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function createPlan(
  input: CreatePlanInput
): Promise<ActionResult<Plan>> {
  const parsed = createPlanSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("plans")
      .insert(mapCreatePlanInput(parsed.data))
      .select("*")
      .single()

    if (error || !data) {
      return error ? mapDatabaseError(error) : failure("provider_error", "Unable to create plan.")
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function updatePlan(
  id: string,
  input: UpdatePlanInput
): Promise<ActionResult<Plan>> {
  const parsedId = planIdSchema.safeParse(id)

  if (!parsedId.success) {
    return validationFailure(firstValidationMessage(parsedId.error))
  }

  const parsed = updatePlanSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("plans")
      .update(mapUpdatePlanInput(parsed.data))
      .eq("id", parsedId.data)
      .select("*")
      .single()

    if (error || !data) {
      return error ? mapDatabaseError(error) : failure("not_found", "Plan not found.")
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function archivePlan(id: string): Promise<ActionResult<Plan>> {
  const parsedId = planIdSchema.safeParse(id)

  if (!parsedId.success) {
    return validationFailure(firstValidationMessage(parsedId.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("plans")
      .update({ is_active: false })
      .eq("id", parsedId.data)
      .select("*")
      .single()

    if (error || !data) {
      return error ? mapDatabaseError(error) : failure("not_found", "Plan not found.")
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}
