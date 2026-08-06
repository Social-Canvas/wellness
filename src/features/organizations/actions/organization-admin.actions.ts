"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import {
  assignOrganizationAdministrator,
  upsertNonprofitOrganization,
} from "@/server/services/organization-admin.service"

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

async function requirePlatformAdmin(): Promise<
  ActionResult<{ profileId: string }>
> {
  const profileResult = await getCurrentProfile()
  if (!profileResult.success) {
    return failure("unauthenticated", "Sign in required.")
  }
  if (
    profileResult.data.role !== "admin" &&
    profileResult.data.role !== "super_admin"
  ) {
    return failure("forbidden", "Platform administrator access required.")
  }
  return { success: true, data: { profileId: profileResult.data.id } }
}

const upsertSchema = z.object({
  organizationId: z.uuid().nullable().optional(),
  name: z.string().trim().min(1).max(200),
  seatLimit: z.number().int().min(0).max(100000),
  status: z.enum([
    "pending",
    "approved",
    "active",
    "suspended",
    "expired",
    "cancelled",
  ]),
  billingStatus: z.enum([
    "unpaid",
    "invoiced",
    "paid",
    "manual_contract",
    "stripe_subscription",
    "past_due",
    "cancelled",
  ]),
  accessStartAt: z.string().nullable().optional(),
  accessEndAt: z.string().nullable().optional(),
  directActivation: z.boolean().optional(),
  approvedEmailDomains: z.array(z.string()).optional(),
})

export async function upsertNonprofitOrganizationAction(
  input: z.infer<typeof upsertSchema>
): Promise<ActionResult<{ id: string }>> {
  const admin = await requirePlatformAdmin()
  if (!admin.success) {
    return admin
  }

  const parsed = upsertSchema.safeParse(input)
  if (!parsed.success) {
    return failure(
      "validation_error",
      parsed.error.issues[0]?.message ?? "Invalid organization details."
    )
  }

  const result = await upsertNonprofitOrganization({
    ...parsed.data,
    actorProfileId: admin.data.profileId,
  })

  if (result.success) {
    revalidatePath("/dashboard/nonprofit")
  }

  return result
}

export async function assignOrganizationAdministratorAction(input: {
  organizationId: string
  email: string
}): Promise<ActionResult<{ memberId: string }>> {
  const admin = await requirePlatformAdmin()
  if (!admin.success) {
    return admin
  }

  const organizationId = z.uuid().safeParse(input.organizationId)
  const email = z.email().safeParse(input.email.trim().toLowerCase())
  if (!organizationId.success || !email.success) {
    return failure("validation_error", "Invalid organization or email.")
  }

  const result = await assignOrganizationAdministrator({
    organizationId: organizationId.data,
    email: email.data,
    actorProfileId: admin.data.profileId,
  })

  if (result.success) {
    revalidatePath("/dashboard/nonprofit")
  }

  return result
}
