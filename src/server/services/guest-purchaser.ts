import "server-only"

import { normalizePurchaserEmail } from "@/server/services/guest-purchaser-email"
import { createAdminClient } from "@/lib/supabase/admin"
import { logger, safeErrorMessage } from "@/server/utils/logger"

function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&")
}

export async function resolvePurchaserProfileId(input: {
  email: string
  fullName?: string | null
}): Promise<{ profileId: string; created: boolean } | null> {
  const email = normalizePurchaserEmail(input.email)
  if (!email) return null

  const admin = createAdminClient()

  const existing = await admin
    .from("profiles")
    .select("id")
    .ilike("email", escapeIlike(email))
    .maybeSingle()

  if (existing.data?.id) {
    return { profileId: existing.data.id, created: false }
  }

  const createdUser = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: input.fullName?.trim() || null,
    },
  })

  let authUserId = createdUser.data.user?.id ?? null
  let created = Boolean(createdUser.data.user)

  if (!authUserId) {
    const recovery = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
    })
    authUserId = recovery.data.user?.id ?? null
    created = false
    if (!authUserId) {
      logger.error("[checkout] Unable to resolve guest purchaser", {
        code: createdUser.error?.code ?? recovery.error?.code ?? null,
        message: createdUser.error?.message ?? recovery.error?.message ?? "unknown",
      })
      return null
    }
  }

  const profile = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("auth_user_id", authUserId)
    .maybeSingle()

  if (profile.data?.id) {
    const fullName = input.fullName?.trim()
    if (created && fullName && !profile.data.full_name) {
      await admin.from("profiles").update({ full_name: fullName }).eq("id", profile.data.id)
    }
    return { profileId: profile.data.id, created }
  }

  const inserted = await admin
    .from("profiles")
    .insert({
      auth_user_id: authUserId,
      email,
      full_name: input.fullName?.trim() || null,
      role: "user",
    })
    .select("id")
    .single()

  if (inserted.data?.id) {
    return { profileId: inserted.data.id, created }
  }

  if (inserted.error?.code === "23505") {
    const retry = await admin
      .from("profiles")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle()
    if (retry.data?.id) {
      return { profileId: retry.data.id, created }
    }
  }

  logger.error("[checkout] Unable to create guest profile", {
    message: inserted.error?.message ?? "unknown",
  })
  return null
}

export async function sendGuestPasswordSetup(email: string, redirectTo: string): Promise<void> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.auth.resetPasswordForEmail(normalizePurchaserEmail(email) ?? email, {
      redirectTo,
    })
    if (error) {
      logger.error("[checkout] Guest password setup email failed", {
        code: error.code ?? null,
        message: error.message,
      })
    }
  } catch (error) {
    logger.error("[checkout] Guest password setup email threw", {
      error: safeErrorMessage(error),
    })
  }
}
