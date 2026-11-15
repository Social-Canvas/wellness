"use server"

import { revalidatePath } from "next/cache"

import type { CreatePlanInput, UpdatePlanInput } from "@/features/plans/schemas"
import {
  archivePlan,
  createPlan,
  updatePlan,
} from "@/features/plans/services/plans.service"
import type { Plan } from "@/features/plans/types"
import type { ActionResult } from "@/features/auth/services/auth.service"
import { requireStaffActor } from "@/server/auth/require-staff"

function revalidatePlansPath() {
  revalidatePath("/admin/plans")
}

export async function createPlanAction(
  input: CreatePlanInput
): Promise<ActionResult<Plan>> {
  const actor = await requireStaffActor()
  if (!actor.success) return actor
  const result = await createPlan(input)

  if (!result.success) {
    return result
  }

  revalidatePlansPath()
  return result
}

export async function updatePlanAction(
  id: string,
  input: UpdatePlanInput
): Promise<ActionResult<Plan>> {
  const actor = await requireStaffActor()
  if (!actor.success) return actor
  const result = await updatePlan(id, input)

  if (!result.success) {
    return result
  }

  revalidatePlansPath()
  return result
}

export async function archivePlanAction(
  id: string
): Promise<ActionResult<Plan>> {
  const actor = await requireStaffActor()
  if (!actor.success) return actor
  const result = await archivePlan(id)

  if (!result.success) {
    return result
  }

  revalidatePlansPath()
  return result
}
