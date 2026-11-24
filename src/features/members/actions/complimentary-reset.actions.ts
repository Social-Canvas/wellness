"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { RESET_COURSE_ID, RESET_LIBRARY_PATH } from "@/features/checkout/constants/destinations"
import { createAdminClient } from "@/lib/supabase/admin"

const grantSchema = z.object({
  email: z.email(),
})

async function requireAdmin() {
  const profile = await getCurrentProfile()
  if (!profile.success) return profile
  if (profile.data.role !== "admin" && profile.data.role !== "super_admin") {
    return {
      success: false as const,
      error: { code: "forbidden" as const, message: "Admin access is required." },
    }
  }
  return profile
}

export async function grantComplimentaryResetAction(
  email: string
): Promise<ActionResult<{ status: "granted" | "already_granted" }>> {
  const admin = await requireAdmin()
  if (!admin.success) return admin

  const parsed = grantSchema.safeParse({ email })
  if (!parsed.success) {
    return { success: false, error: { code: "validation_error", message: "Enter a valid email." } }
  }

  const supabase = createAdminClient()
  const member = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", parsed.data.email.trim().toLowerCase().replace(/[%_\\]/g, (c) => `\\${c}`))
    .maybeSingle()

  if (!member.data?.id) {
    return { success: false, error: { code: "not_found", message: "No member with that email." } }
  }

  const product = await supabase
    .from("products")
    .select("id")
    .eq("slug", "7-day-reset")
    .maybeSingle()

  if (!product.data?.id) {
    return { success: false, error: { code: "not_found", message: "Reset product is not configured." } }
  }

  const inserted = await supabase.from("product_entitlements").insert({
    user_id: member.data.id,
    product_id: product.data.id,
    source: "complimentary",
  })

  if (inserted.error && inserted.error.code !== "23505") {
    return { success: false, error: { code: "provider_error", message: "Unable to grant access." } }
  }

  revalidatePath("/admin/members")
  revalidatePath(RESET_LIBRARY_PATH)
  revalidatePath(`/dashboard/library/${RESET_COURSE_ID}`)

  return {
    success: true,
    data: { status: inserted.error?.code === "23505" ? "already_granted" : "granted" },
  }
}

export async function revokeComplimentaryResetAction(
  email: string
): Promise<ActionResult<{ revoked: boolean }>> {
  const admin = await requireAdmin()
  if (!admin.success) return admin

  const parsed = grantSchema.safeParse({ email })
  if (!parsed.success) {
    return { success: false, error: { code: "validation_error", message: "Enter a valid email." } }
  }

  const supabase = createAdminClient()
  const member = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", parsed.data.email.trim().toLowerCase().replace(/[%_\\]/g, (c) => `\\${c}`))
    .maybeSingle()

  if (!member.data?.id) {
    return { success: false, error: { code: "not_found", message: "No member with that email." } }
  }

  const product = await supabase
    .from("products")
    .select("id")
    .eq("slug", "7-day-reset")
    .maybeSingle()

  if (!product.data?.id) {
    return { success: false, error: { code: "not_found", message: "Reset product is not configured." } }
  }

  const deleted = await supabase
    .from("product_entitlements")
    .delete()
    .eq("user_id", member.data.id)
    .eq("product_id", product.data.id)
    .eq("source", "complimentary")

  if (deleted.error) {
    return { success: false, error: { code: "provider_error", message: "Unable to revoke access." } }
  }

  revalidatePath("/admin/members")
  return { success: true, data: { revoked: true } }
}
