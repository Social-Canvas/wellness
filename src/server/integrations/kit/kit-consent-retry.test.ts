import assert from "node:assert/strict"
import { test } from "node:test"

import type { KitRuntimeConfig } from "./kit.pure.ts"
import { processPendingMarketingConsentSyncs } from "./kit.pure.ts"

const enabledConfig: KitRuntimeConfig = {
  syncEnabled: true,
  apiKeyPresent: true,
  apiKey: "kit_test_key",
  newsletterFormId: 9811927,
  isProduction: true,
  isTestEnvironment: false,
  requestTimeoutMs: 5000,
}

test("processPendingMarketingConsentSyncs no-ops when Kit sync disabled", async () => {
  let fetchCalls = 0

  const result = await processPendingMarketingConsentSyncs({
    config: { ...enabledConfig, syncEnabled: false },
    batchSize: 25,
    fetchEligible: async () => {
      fetchCalls += 1
      return [{ id: "consent-1", user_id: null }]
    },
    resolveFullName: async () => null,
    syncConsent: async () => {
      throw new Error("must not sync when disabled")
    },
  })

  assert.deepEqual(result, {
    eligible: 0,
    processed: 0,
    synced: 0,
    failed: 0,
    skipped: 0,
  })
  assert.equal(fetchCalls, 0)
})

test("processPendingMarketingConsentSyncs retries eligible pending consents", async () => {
  const syncedIds: string[] = []

  const result = await processPendingMarketingConsentSyncs({
    config: enabledConfig,
    batchSize: 2,
    fetchEligible: async (limit) => {
      assert.equal(limit, 2)
      return [
        { id: "consent-1", user_id: "user-1" },
        { id: "consent-2", user_id: null },
      ]
    },
    resolveFullName: async (userId) => (userId === "user-1" ? "Alex Member" : null),
    syncConsent: async (consentId, options) => {
      syncedIds.push(`${consentId}:${options.fullName ?? ""}`)
      return consentId === "consent-2"
        ? { synced: false, skipped: false, failed: true }
        : { synced: true, skipped: false, failed: false }
    },
  })

  assert.equal(result.eligible, 2)
  assert.equal(result.processed, 2)
  assert.equal(result.synced, 1)
  assert.equal(result.failed, 1)
  assert.equal(result.skipped, 0)
  assert.deepEqual(syncedIds, ["consent-1:Alex Member", "consent-2:"])
})

test("processPendingMarketingConsentSyncs counts skipped consents", async () => {
  const result = await processPendingMarketingConsentSyncs({
    config: enabledConfig,
    batchSize: 25,
    fetchEligible: async () => [{ id: "consent-unsub", user_id: null }],
    resolveFullName: async () => null,
    syncConsent: async () => ({ synced: false, skipped: true, failed: false }),
  })

  assert.equal(result.processed, 1)
  assert.equal(result.skipped, 1)
})

test("processPendingMarketingConsentSyncs handles unexpected sync errors", async () => {
  const result = await processPendingMarketingConsentSyncs({
    config: enabledConfig,
    batchSize: 25,
    fetchEligible: async () => [{ id: "consent-boom", user_id: null }],
    resolveFullName: async () => null,
    syncConsent: async () => {
      throw new Error("unexpected")
    },
  })

  assert.equal(result.processed, 1)
  assert.equal(result.failed, 1)
})
