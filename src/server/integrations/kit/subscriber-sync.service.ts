import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { logger, providerErrorFields } from "@/server/utils/logger"

import { syncSubscriberToKit } from "./client"
import { getKitConfig } from "./config"
import {
  syncMarketingConsentToKit as syncMarketingConsentToKitPure,
  type SyncMarketingConsentDeps,
} from "./kit.pure"

export type { SyncMarketingConsentDeps } from "./kit.pure"

function buildDefaultDeps(): SyncMarketingConsentDeps {
  const supabase = createAdminClient()

  return {
    config: getKitConfig(),
    loadConsent: async (consentId) => {
      const { data, error } = await supabase
        .from("marketing_consents")
        .select("id, email, status, kit_subscriber_id")
        .eq("id", consentId)
        .maybeSingle()

      if (error) {
        logger.error("marketing_consent.load_failed", {
          consentId,
          ...providerErrorFields(error),
        })
        return null
      }

      return data
    },
    updateSyncStatus: async (input) => {
      const { error } = await supabase
        .from("marketing_consents")
        .update({
          kit_sync_status: input.kitSyncStatus,
          kit_subscriber_id: input.kitSubscriberId,
          kit_last_sync_error: input.kitLastSyncError,
        })
        .eq("id", input.consentId)

      if (error) {
        logger.error("marketing_consent.sync_status_update_failed", {
          consentId: input.consentId,
          kitSyncStatus: input.kitSyncStatus,
          ...providerErrorFields(error),
        })
      }
    },
    syncToKit: syncSubscriberToKit,
    onSyncFailed: ({ consentId, status, error }) => {
      logger.warn("marketing_consent.kit_sync_failed", {
        consentId,
        status,
        error,
      })
    },
    onSynced: ({ consentId, kitSubscriberId, created }) => {
      logger.info("marketing_consent.kit_synced", {
        consentId,
        kitSubscriberId,
        created,
      })
    },
  }
}

export async function syncMarketingConsentToKit(
  consentId: string,
  options: {
    fullName?: string | null
    deps?: Partial<SyncMarketingConsentDeps>
  } = {}
): Promise<{ synced: boolean; skipped: boolean; failed: boolean }> {
  const defaults = buildDefaultDeps()

  return syncMarketingConsentToKitPure(consentId, {
    fullName: options.fullName,
    deps: {
      ...defaults,
      ...options.deps,
      config: options.deps?.config ?? defaults.config,
    },
  })
}
