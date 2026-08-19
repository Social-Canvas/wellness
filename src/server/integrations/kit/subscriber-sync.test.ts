import assert from "node:assert/strict"
import { test } from "node:test"

import type { KitRuntimeConfig } from "./kit.pure.ts"
import { syncMarketingConsentToKit } from "./kit.pure.ts"

const enabledConfig: KitRuntimeConfig = {
  syncEnabled: true,
  apiKeyPresent: true,
  apiKey: "kit_test_key",
  newsletterFormId: 9811927,
  isProduction: false,
  isTestEnvironment: false,
  requestTimeoutMs: 5000,
}

const baseConsent = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "member@example.com",
  status: "active" as const,
  kit_subscriber_id: null,
}

test("syncMarketingConsentToKit skips unsubscribed consent", async () => {
  const updates: Array<Record<string, unknown>> = []

  const result = await syncMarketingConsentToKit(baseConsent.id, {
    deps: {
      config: enabledConfig,
      loadConsent: async () => ({ ...baseConsent, status: "unsubscribed" }),
      updateSyncStatus: async (input) => {
        updates.push(input)
      },
      syncToKit: async () => {
        throw new Error("must not call Kit for unsubscribed consent")
      },
    },
  })

  assert.equal(result.skipped, true)
  assert.equal(result.synced, false)
  assert.equal(updates.length, 1)
  assert.equal(updates[0]?.kitSyncStatus, "skipped")
})

test("syncMarketingConsentToKit marks pending when sync disabled", async () => {
  const updates: Array<Record<string, unknown>> = []

  const result = await syncMarketingConsentToKit(baseConsent.id, {
    deps: {
      config: {
        ...enabledConfig,
        syncEnabled: false,
      },
      loadConsent: async () => baseConsent,
      updateSyncStatus: async (input) => {
        updates.push(input)
      },
      syncToKit: async () => {
        throw new Error("must not call Kit when sync disabled")
      },
    },
  })

  assert.equal(result.skipped, false)
  assert.equal(result.synced, false)
  assert.equal(result.failed, false)
  assert.equal(updates[0]?.kitSyncStatus, "pending")
  assert.equal(updates[0]?.kitLastSyncError, null)
})

test("syncMarketingConsentToKit marks pending when API key missing", async () => {
  const updates: Array<Record<string, unknown>> = []

  const result = await syncMarketingConsentToKit(baseConsent.id, {
    deps: {
      config: {
        ...enabledConfig,
        apiKeyPresent: false,
        apiKey: "",
      },
      loadConsent: async () => baseConsent,
      updateSyncStatus: async (input) => {
        updates.push(input)
      },
      syncToKit: async () => {
        throw new Error("must not call Kit without API key")
      },
    },
  })

  assert.equal(result.skipped, false)
  assert.equal(updates[0]?.kitSyncStatus, "pending")
  assert.equal(updates[0]?.kitLastSyncError, "KIT_API_KEY is not configured.")
})

test("syncMarketingConsentToKit marks pending in test environment", async () => {
  const updates: Array<Record<string, unknown>> = []

  const result = await syncMarketingConsentToKit(baseConsent.id, {
    deps: {
      config: {
        ...enabledConfig,
        isTestEnvironment: true,
      },
      loadConsent: async () => baseConsent,
      updateSyncStatus: async (input) => {
        updates.push(input)
      },
      syncToKit: async () => {
        throw new Error("must not call Kit in test environment")
      },
    },
  })

  assert.equal(result.skipped, false)
  assert.equal(updates[0]?.kitSyncStatus, "pending")
})

test("syncMarketingConsentToKit records synced subscriber id on success", async () => {
  const updates: Array<Record<string, unknown>> = []

  const result = await syncMarketingConsentToKit(baseConsent.id, {
    fullName: "Alex Member",
    deps: {
      config: enabledConfig,
      loadConsent: async () => baseConsent,
      updateSyncStatus: async (input) => {
        updates.push(input)
      },
      syncToKit: async (input) => {
        assert.equal(input.emailAddress, "member@example.com")
        assert.equal(input.firstName, "Alex")
        return {
          ok: true,
          created: true,
          subscriber: {
            id: 9001,
            first_name: "Alex",
            email_address: "member@example.com",
            state: "active",
            created_at: "2026-01-01T00:00:00Z",
            fields: {},
          },
        }
      },
    },
  })

  assert.equal(result.synced, true)
  assert.equal(updates[0]?.kitSyncStatus, "synced")
  assert.equal(updates[0]?.kitSubscriberId, 9001)
})

test("syncMarketingConsentToKit records failed status without throwing", async () => {
  const updates: Array<Record<string, unknown>> = []

  const result = await syncMarketingConsentToKit(baseConsent.id, {
    deps: {
      config: enabledConfig,
      loadConsent: async () => baseConsent,
      updateSyncStatus: async (input) => {
        updates.push(input)
      },
      syncToKit: async () => ({
        ok: false,
        error: "Kit API request failed",
        status: 422,
      }),
    },
  })

  assert.equal(result.failed, true)
  assert.equal(updates[0]?.kitSyncStatus, "failed")
  assert.equal(updates[0]?.kitLastSyncError, "Kit API request failed")
})

test("syncMarketingConsentToKit retains partial subscriber id when form add fails", async () => {
  const updates: Array<Record<string, unknown>> = []

  const result = await syncMarketingConsentToKit(baseConsent.id, {
    deps: {
      config: enabledConfig,
      loadConsent: async () => baseConsent,
      updateSyncStatus: async (input) => {
        updates.push(input)
      },
      syncToKit: async () => ({
        ok: false,
        error: "Form unavailable",
        status: 422,
        subscriberId: 9001,
      }),
    },
  })

  assert.equal(result.failed, true)
  assert.equal(updates[0]?.kitSubscriberId, 9001)
})

test("syncMarketingConsentToKit is idempotent for already-synced consent", async () => {
  let syncCalls = 0

  const result = await syncMarketingConsentToKit(baseConsent.id, {
    deps: {
      config: enabledConfig,
      loadConsent: async () => ({
        ...baseConsent,
        kit_subscriber_id: 9001,
      }),
      updateSyncStatus: async () => {},
      syncToKit: async () => {
        syncCalls += 1
        return {
          ok: true,
          created: false,
          subscriber: {
            id: 9001,
            first_name: "Alex",
            email_address: "member@example.com",
            state: "active",
            created_at: "2026-01-01T00:00:00Z",
            fields: {},
          },
        }
      },
    },
  })

  assert.equal(result.synced, true)
  assert.equal(syncCalls, 1)
})
