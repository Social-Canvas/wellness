import "server-only"

import {
  consumeRateLimit,
  LEAD_RATE_LIMIT_USER_ERROR,
  RATE_LIMIT_USER_ERROR,
  redactRateLimitHash,
  type RateLimitPolicy,
  type RateLimitStore,
} from "@/features/bot-protection/utils/durable-rate-limit"
import { createAdminClient } from "@/lib/supabase/admin"
import { logger, providerErrorFields, safeErrorMessage } from "@/server/utils/logger"

export { LEAD_RATE_LIMIT_USER_ERROR, RATE_LIMIT_USER_ERROR }

function createSupabaseRateLimitStore(): RateLimitStore {
  const supabase = createAdminClient()

  return {
    async listSince(input) {
      const { data, error } = await supabase
        .from("public_form_rate_limits")
        .select("key_type, key_hash, created_at")
        .eq("scope", input.scope)
        .in("key_hash", input.keyHashes)
        .gte("created_at", input.sinceIso)

      if (error) {
        throw error
      }

      return (data ?? []).map((row) => ({
        keyType: row.key_type,
        keyHash: row.key_hash,
        createdAtMs: Date.parse(row.created_at),
      }))
    },
    async insert(rows) {
      const { error } = await supabase.from("public_form_rate_limits").insert(
        rows.map((row) => ({
          scope: row.scope,
          key_type: row.keyType,
          key_hash: row.keyHash,
          created_at: row.createdAtIso,
        }))
      )

      if (error) {
        throw error
      }
    },
  }
}

/**
 * Durable consume. Fail-open if the table is missing so deploys before the
 * migration do not take down public forms. In-memory burst still applies
 * in the caller.
 */
export async function consumePublicFormRateLimit(input: {
  policy: RateLimitPolicy
  email: string
  ip: string
}): Promise<"ok" | "limited"> {
  try {
    const decision = await consumeRateLimit({
      store: createSupabaseRateLimitStore(),
      policy: input.policy,
      email: input.email,
      ip: input.ip,
    })

    if (!decision.allowed) {
      logger.warn("Public form rate limit reached.", {
        scope: input.policy.scope,
        emailHash: redactRateLimitHash(decision.emailHash),
        ipHash: redactRateLimitHash(decision.ipHash),
        dimension: decision.hit?.keyType,
        windowMs: decision.hit?.windowMs,
        max: decision.hit?.max,
        count: decision.hit?.count,
      })
      return "limited"
    }

    return "ok"
  } catch (error) {
    logger.warn("Public form rate limit store unavailable; failing open.", {
      scope: input.policy.scope,
      ...providerErrorFields(error),
      error: safeErrorMessage(error),
    })
    return "ok"
  }
}
