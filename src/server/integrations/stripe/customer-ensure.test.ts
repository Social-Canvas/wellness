import assert from "node:assert/strict"
import { test } from "node:test"

import {
  ensureStripeCustomerId,
  isMissingStripeCustomerError,
  stripeCustomerIdSuffix,
  type EnsureStripeCustomerDeps,
  type EnsureStripeCustomerProfile,
} from "./customer-ensure.ts"

const profile: EnsureStripeCustomerProfile = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "member@example.com",
  stripe_customer_id: "cus_UusViHrO74yNag",
}

function missingCustomerError(customerId: string) {
  return {
    type: "StripeInvalidRequestError",
    code: "resource_missing",
    message: `No such customer: '${customerId}'`,
  }
}

test("isMissingStripeCustomerError detects resource_missing customer errors", () => {
  assert.equal(
    isMissingStripeCustomerError(
      missingCustomerError("cus_UusViHrO74yNag")
    ),
    true
  )

  assert.equal(
    isMissingStripeCustomerError({
      type: "invalid_request_error",
      code: "resource_missing",
      message:
        "No such price: 'price_1ABC'; a similar object exists in live mode, but a test mode key was used to make this request.",
    }),
    false
  )

  assert.equal(
    isMissingStripeCustomerError({
      message: "No such customer: 'cus_abc'",
    }),
    true
  )

  assert.equal(isMissingStripeCustomerError(new Error("network down")), false)
})

test("stripeCustomerIdSuffix exposes only the last 4 characters", () => {
  assert.equal(stripeCustomerIdSuffix("cus_UusViHrO74yNag"), "yNag")
  assert.equal(stripeCustomerIdSuffix("cus_"), "cus_")
  assert.equal(stripeCustomerIdSuffix("ab"), "ab")
})

test("ensureStripeCustomerId recreates when stored customer is missing in current mode", async () => {
  const calls: string[] = []
  let savedCustomerId: string | null = profile.stripe_customer_id
  let staleLoggedSuffix: string | null = null

  const deps: EnsureStripeCustomerDeps = {
    retrieveCustomer: async (customerId) => {
      calls.push(`retrieve:${customerId}`)
      throw missingCustomerError(customerId)
    },
    createCustomer: async (params) => {
      calls.push(`create:${params.email}`)
      assert.equal(params.metadata.profile_id, profile.id)
      return { id: "cus_liveReplacement0001" }
    },
    clearCustomerId: async (profileId) => {
      calls.push(`clear:${profileId}`)
      savedCustomerId = null
      return { error: null }
    },
    saveCustomerId: async (profileId, customerId) => {
      calls.push(`save:${profileId}:${customerId}`)
      savedCustomerId = customerId
      return { error: null }
    },
    onStaleCustomer: ({ customerIdSuffix }) => {
      staleLoggedSuffix = customerIdSuffix
    },
  }

  const result = await ensureStripeCustomerId(profile, deps)

  assert.equal(result.success, true)
  if (!result.success) {
    return
  }

  assert.equal(result.data, "cus_liveReplacement0001")
  assert.equal(savedCustomerId, "cus_liveReplacement0001")
  assert.equal(staleLoggedSuffix, "yNag")
  assert.deepEqual(calls, [
    "retrieve:cus_UusViHrO74yNag",
    `clear:${profile.id}`,
    "create:member@example.com",
    `save:${profile.id}:cus_liveReplacement0001`,
  ])
})

test("ensureStripeCustomerId reuses an existing customer that retrieves successfully", async () => {
  const calls: string[] = []

  const deps: EnsureStripeCustomerDeps = {
    retrieveCustomer: async (customerId) => {
      calls.push(`retrieve:${customerId}`)
      return { id: customerId }
    },
    createCustomer: async () => {
      calls.push("create")
      return { id: "cus_shouldNotCreate" }
    },
    clearCustomerId: async () => {
      calls.push("clear")
      return { error: null }
    },
    saveCustomerId: async () => {
      calls.push("save")
      return { error: null }
    },
  }

  const result = await ensureStripeCustomerId(profile, deps)

  assert.equal(result.success, true)
  if (result.success) {
    assert.equal(result.data, profile.stripe_customer_id)
  }
  assert.deepEqual(calls, ["retrieve:cus_UusViHrO74yNag"])
})

test("ensureStripeCustomerId creates when profile has no customer id", async () => {
  const calls: string[] = []
  const emptyProfile: EnsureStripeCustomerProfile = {
    ...profile,
    stripe_customer_id: null,
  }

  const deps: EnsureStripeCustomerDeps = {
    retrieveCustomer: async () => {
      calls.push("retrieve")
      return { id: "cus_unused" }
    },
    createCustomer: async () => {
      calls.push("create")
      return { id: "cus_brandNew0001" }
    },
    clearCustomerId: async () => {
      calls.push("clear")
      return { error: null }
    },
    saveCustomerId: async (_profileId, customerId) => {
      calls.push(`save:${customerId}`)
      return { error: null }
    },
  }

  const result = await ensureStripeCustomerId(emptyProfile, deps)

  assert.equal(result.success, true)
  if (result.success) {
    assert.equal(result.data, "cus_brandNew0001")
  }
  assert.deepEqual(calls, ["create", "save:cus_brandNew0001"])
})

test("ensureStripeCustomerId fails without recreating on unrelated retrieve errors", async () => {
  const calls: string[] = []

  const deps: EnsureStripeCustomerDeps = {
    retrieveCustomer: async () => {
      calls.push("retrieve")
      throw new Error("rate_limit")
    },
    createCustomer: async () => {
      calls.push("create")
      return { id: "cus_shouldNotCreate" }
    },
    clearCustomerId: async () => {
      calls.push("clear")
      return { error: null }
    },
    saveCustomerId: async () => {
      calls.push("save")
      return { error: null }
    },
  }

  const result = await ensureStripeCustomerId(profile, deps)

  assert.equal(result.success, false)
  assert.deepEqual(calls, ["retrieve"])
})
