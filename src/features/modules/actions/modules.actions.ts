"use server"

import { revalidatePath } from "next/cache"

import type { CreateModuleInput, UpdateModuleInput } from "@/features/modules/schemas"
import {
  archiveModule,
  createModule,
  updateModule,
} from "@/features/modules/services/modules.service"
import type { Module } from "@/features/modules/types"
import type { ActionResult } from "@/features/auth/services/auth.service"

function revalidateModulesPath(courseId: string) {
  revalidatePath(`/admin/courses/${courseId}/modules`)
}

export async function createModuleAction(
  courseId: string,
  input: CreateModuleInput
): Promise<ActionResult<Module>> {
  const result = await createModule(courseId, input)

  if (!result.success) {
    return result
  }

  revalidateModulesPath(courseId)
  return result
}

export async function updateModuleAction(
  courseId: string,
  id: string,
  input: UpdateModuleInput
): Promise<ActionResult<Module>> {
  const result = await updateModule(id, input)

  if (!result.success) {
    return result
  }

  revalidateModulesPath(courseId)
  return result
}

export async function archiveModuleAction(
  courseId: string,
  id: string
): Promise<ActionResult<Module>> {
  const result = await archiveModule(id)

  if (!result.success) {
    return result
  }

  revalidateModulesPath(courseId)
  return result
}
