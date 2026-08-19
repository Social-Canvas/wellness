import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { getKitConfig } from "@/server/integrations/kit/config"
import {
  processPendingMarketingConsentSyncs as processPendingMarketingConsentSyncsPure,
  type KitConsentRetryResult,
} from "@/server/integrations/kit/kit.pure"
import { syncMarketingConsentToKit } from "@/server/integrations/kit/subscriber-sync.service"
import { logger, providerErrorFields } from "@/server/utils/logger"

export type { KitConsentRetryResult } from "@/server/integrations/kit/kit.pure"

function parseBatchSize(): number {
  const raw = Number.parseInt(process.env.KIT_CONSENT_SYNC_BATCH_SIZE ?? "25", 10)
  if (!Number.isFinite(raw) || raw <= 0) {
    return 25
  }

  return Math.min(raw, 100)
}

/**
 * Retry pending/failed active marketing consents when Kit sync is enabled.
 * Returns counts only — never emails or API keys.
 */
export async function processPendingMarketingConsentSyncs(): Promise<KitConsentRetryResult> {
  const supabase = createAdminClient()
  const config = getKitConfig()
  const batchSize = parseBatchSize()

  return processPendingMarketingConsentSyncsPure({
    config,
    batchSize,
    fetchEligible: async (limit) => {
      const { data, error } = await supabase
        .from("marketing_consents")
        .select("id, user_id")
        .eq("status", "active")
        .in("kit_sync_status", ["pending", "failed"])
        .order("updated_at", { ascending: true })
        .limit(limit)

      if (error) {
        logger.error("marketing_consent.retry_fetch_failed", providerErrorFields(error))
        return []
      }

      return data ?? []
    },
    resolveFullName: async (userId) => {
      if (!userId) {
        return null
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle()

      if (error || !data?.full_name?.trim()) {
        return null
      }

      return data.full_name
    },
    syncConsent: syncMarketingConsentToKit,
    onUnexpectedError: ({ consentId, error }) => {
      logger.error("marketing_consent.retry_sync_unexpected", {
        consentId,
        error,
      })
    },
  })
}
