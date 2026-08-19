import "server-only"

import { z } from "zod"

import { createAdminClient } from "@/lib/supabase/admin"
import { syncMarketingConsentToKit } from "@/server/integrations/kit/subscriber-sync.service"
import { logger, providerErrorFields } from "@/server/utils/logger"
import type { Database } from "@/types/database/supabase"

const emailSchema = z.email()

export type MarketingConsentSource = "checkout_membership" | "checkout_product"

export type RecordCheckoutMarketingConsentInput = {
  email: string
  userId: string
  source: MarketingConsentSource
  fullName?: string | null
}

type MarketingConsentInsert = Database["public"]["Tables"]["marketing_consents"]["Insert"]

function normalizeMarketingEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase()
  return emailSchema.safeParse(normalized).success ? normalized : null
}

function buildConsentInsert(
  input: RecordCheckoutMarketingConsentInput,
  normalizedEmail: string
): MarketingConsentInsert {
  return {
    email: normalizedEmail,
    user_id: input.userId,
    status: "active",
    source: input.source,
    consented_at: new Date().toISOString(),
    kit_sync_status: "pending",
  }
}

/**
 * Persist explicit checkout marketing consent and attempt Kit sync.
 * Failures in persistence or Kit must not block checkout.
 */
export async function recordCheckoutMarketingConsent(
  input: RecordCheckoutMarketingConsentInput
): Promise<void> {
  const normalizedEmail = normalizeMarketingEmail(input.email)

  if (!normalizedEmail) {
    logger.warn("marketing_consent.invalid_email", { userId: input.userId, source: input.source })
    return
  }

  const supabase = createAdminClient()

  const { data: existing, error: existingError } = await supabase
    .from("marketing_consents")
    .select("id, status, user_id, kit_sync_status, kit_subscriber_id")
    .eq("email", normalizedEmail)
    .maybeSingle()

  if (existingError) {
    logger.error("marketing_consent.lookup_failed", {
      userId: input.userId,
      source: input.source,
      ...providerErrorFields(existingError),
    })
    return
  }

  let consentId: string | null = existing?.id ?? null

  if (existing) {
    if (existing.status === "unsubscribed") {
      const { data: reconsent, error: reconsentError } = await supabase
        .from("marketing_consents")
        .update({
          status: "active",
          user_id: existing.user_id ?? input.userId,
          source: input.source,
          consented_at: new Date().toISOString(),
          unsubscribed_at: null,
          kit_sync_status: "pending",
          kit_last_sync_error: null,
        })
        .eq("id", existing.id)
        .select("id")
        .single()

      if (reconsentError) {
        logger.error("marketing_consent.reconsent_failed", {
          consentId: existing.id,
          ...providerErrorFields(reconsentError),
        })
        return
      }

      consentId = reconsent.id
    } else {
      if (!existing.user_id) {
        const { error: linkError } = await supabase
          .from("marketing_consents")
          .update({ user_id: input.userId })
          .eq("id", existing.id)

        if (linkError) {
          logger.warn("marketing_consent.link_user_failed", {
            consentId: existing.id,
            ...providerErrorFields(linkError),
          })
        }
      }

      consentId = existing.id
    }
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from("marketing_consents")
      .insert(buildConsentInsert(input, normalizedEmail))
      .select("id")
      .single()

    if (insertError) {
      logger.error("marketing_consent.insert_failed", {
        userId: input.userId,
        source: input.source,
        ...providerErrorFields(insertError),
      })
      return
    }

    consentId = inserted.id
  }

  if (!consentId) {
    return
  }

  try {
    await syncMarketingConsentToKit(consentId, { fullName: input.fullName })
  } catch (error) {
    logger.error("marketing_consent.kit_sync_unexpected", {
      consentId,
      ...providerErrorFields(error),
    })
  }
}
