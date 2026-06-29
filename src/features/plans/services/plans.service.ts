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
import { logger, safeErrorMessage } from "@/server/utils/logger"
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

type PlanDatabaseError = {
  code?: string
  message: string
  details?: string
  hint?: string
}

function getAdminSupabase() {
  return createAdminClient()
}

function logPlanDatabaseError(
  operation: string,
  error: PlanDatabaseError,
  context?: Record<string, unknown>
): void {
  logger.error(`[plans] ${operation} failed`, {
    operation,
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
    ...context,
  })
}

function mapDatabaseError(
  operation: string,
  error: PlanDatabaseError,
  context?: Record<string, unknown>
): ActionResult<never> {
  logPlanDatabaseError(operation, error, context)

  if (error.code === "23505") {
    return failure("validation_error", "A plan with this slug already exists.")
  }

  if (error.code === "42501") {
    return failure("provider_error", "Unable to complete the plan request. Please try again.")
  }

  if (error.code === "PGRST116") {
    return failure("not_found", "Plan not found.")
  }

  return failure("provider_error", "Unable to complete the plan request. Please try again.")
}

function mapUnexpectedError(operation: string, caughtError: unknown): ActionResult<never> {
  logger.error(`[plans] ${operation} unexpected error`, {
    operation,
    error: safeErrorMessage(caughtError),
  })

  return failure("unknown_error", "Something went wrong. Please try again.")
}

export async function listPlans(): Promise<ActionResult<PlanWithPrices[]>> {
  try {
    const supabase = getAdminSupabase()
    const { data, error } = await supabase
      .from("plans")
      .select("*, plan_prices(*)")
      .order("sort_order", { ascending: true })

    if (error) {
      return mapDatabaseError("listPlans", error)
    }

    return success((data ?? []).map(mapPlanWithPrices))
  } catch (caughtError) {
    return mapUnexpectedError("listPlans", caughtError)
  }
}

export async function getPlan(id: string): Promise<ActionResult<PlanWithPrices>> {
  const parsedId = planIdSchema.safeParse(id)

  if (!parsedId.success) {
    return validationFailure(firstValidationMessage(parsedId.error))
  }

  try {
    const supabase = getAdminSupabase()
    const { data, error } = await supabase
      .from("plans")
      .select("*, plan_prices(*)")
      .eq("id", parsedId.data)
      .maybeSingle()

    if (error) {
      return mapDatabaseError("getPlan", error, { planId: parsedId.data })
    }

    if (!data) {
      return failure("not_found", "Plan not found.")
    }

    return success(mapPlanWithPrices(data))
  } catch (caughtError) {
    return mapUnexpectedError("getPlan", caughtError)
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
    const supabase = getAdminSupabase()
    const { data, error } = await supabase
      .from("plans")
      .insert(mapCreatePlanInput(parsed.data))
      .select("*")
      .single()

    if (error) {
      return mapDatabaseError("createPlan", error, { slug: parsed.data.slug })
    }

    if (!data) {
      logger.error("[plans] createPlan failed", {
        operation: "createPlan",
        reason: "insert_returned_no_row",
        slug: parsed.data.slug,
      })
      return failure("provider_error", "Unable to complete the plan request. Please try again.")
    }

    return success(data)
  } catch (caughtError) {
    return mapUnexpectedError("createPlan", caughtError)
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
    const supabase = getAdminSupabase()
    const { data, error } = await supabase
      .from("plans")
      .update(mapUpdatePlanInput(parsed.data))
      .eq("id", parsedId.data)
      .select("*")
      .single()

    if (error) {
      return mapDatabaseError("updatePlan", error, { planId: parsedId.data })
    }

    if (!data) {
      logger.error("[plans] updatePlan failed", {
        operation: "updatePlan",
        reason: "update_returned_no_row",
        planId: parsedId.data,
      })
      return failure("not_found", "Plan not found.")
    }

    return success(data)
  } catch (caughtError) {
    return mapUnexpectedError("updatePlan", caughtError)
  }
}

export async function archivePlan(id: string): Promise<ActionResult<Plan>> {
  const parsedId = planIdSchema.safeParse(id)

  if (!parsedId.success) {
    return validationFailure(firstValidationMessage(parsedId.error))
  }

  try {
    const supabase = getAdminSupabase()
    const { data, error } = await supabase
      .from("plans")
      .update({ is_active: false })
      .eq("id", parsedId.data)
      .select("*")
      .single()

    if (error) {
      return mapDatabaseError("archivePlan", error, { planId: parsedId.data })
    }

    if (!data) {
      logger.error("[plans] archivePlan failed", {
        operation: "archivePlan",
        reason: "update_returned_no_row",
        planId: parsedId.data,
      })
      return failure("not_found", "Plan not found.")
    }

    return success(data)
  } catch (caughtError) {
    return mapUnexpectedError("archivePlan", caughtError)
  }
}
