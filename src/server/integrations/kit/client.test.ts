import assert from "node:assert/strict"
import { test } from "node:test"

import { KIT_API_BASE_URL, createOrUpdateKitSubscriber, syncSubscriberToKit } from "./kit.pure.ts"
import type { KitRuntimeConfig } from "./kit.pure.ts"

const enabledConfig: KitRuntimeConfig = {
  syncEnabled: true,
  apiKeyPresent: true,
  apiKey: "kit_test_key",
  newsletterFormId: 9811927,
  isProduction: false,
  isTestEnvironment: false,
  requestTimeoutMs: 5000,
}

test("createOrUpdateKitSubscriber posts to Kit V4 with X-Kit-Api-Key header", async () => {
  let requestedUrl = ""
  let requestInit: RequestInit | undefined

  const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
    requestedUrl = String(url)
    requestInit = init
    return new Response(
      JSON.stringify({
        subscriber: {
          id: 42,
          first_name: "Alex",
          email_address: "alex@example.com",
          state: "active",
          created_at: "2026-01-01T00:00:00Z",
          fields: {},
        },
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    )
  }

  const result = await createOrUpdateKitSubscriber(
    { emailAddress: "alex@example.com", firstName: "Alex" },
    { fetchImpl, config: enabledConfig }
  )

  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.subscriber.id, 42)
    assert.equal(result.created, true)
  }

  assert.equal(requestedUrl, `${KIT_API_BASE_URL}/v4/subscribers`)
  assert.equal(requestInit?.method, "POST")
  assert.equal(
    (requestInit?.headers as Record<string, string>)["X-Kit-Api-Key"],
    "kit_test_key"
  )

  const body = JSON.parse(String(requestInit?.body))
  assert.equal(body.email_address, "alex@example.com")
  assert.equal(body.first_name, "Alex")
  assert.equal(body.state, "active")
})

test("createOrUpdateKitSubscriber redacts API key fragments from errors", async () => {
  const fetchImpl = async () =>
    new Response(JSON.stringify({ errors: ["Invalid kit_secret_abc123 key"] }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })

  const result = await createOrUpdateKitSubscriber(
    { emailAddress: "alex@example.com", firstName: null },
    { fetchImpl, config: enabledConfig }
  )

  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.match(result.error, /\[REDACTED\]/)
    assert.doesNotMatch(result.error, /kit_secret_abc123/)
  }
})

test("automated tests never call api.kit.com when Kit writes are blocked", async () => {
  const { canPerformKitWrite } = await import("./kit.pure.ts")

  const blockedConfig = {
    syncEnabled: true,
    apiKeyPresent: true,
    apiKey: "kit_test_key",
    newsletterFormId: 9811927,
    isProduction: false,
    isTestEnvironment: true,
    requestTimeoutMs: 5000,
  }

  assert.equal(canPerformKitWrite(blockedConfig), false)
})

test("syncSubscriberToKit upserts subscriber then adds to newsletter form", async () => {
  const requestedUrls: string[] = []

  const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
    requestedUrls.push(String(url))

    if (String(url).endsWith("/v4/subscribers")) {
      return new Response(
        JSON.stringify({
          subscriber: {
            id: 42,
            first_name: "Alex",
            email_address: "alex@example.com",
            state: "active",
            created_at: "2026-01-01T00:00:00Z",
            fields: {},
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      )
    }

    if (String(url).endsWith("/v4/forms/9811927/subscribers")) {
      assert.equal(init?.method, "POST")
      const body = JSON.parse(String(init?.body))
      assert.equal(body.email_address, "alex@example.com")
      return new Response(
        JSON.stringify({
          subscriber: {
            id: 42,
            first_name: "Alex",
            email_address: "alex@example.com",
            state: "active",
            created_at: "2026-01-01T00:00:00Z",
            fields: {},
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response("not found", { status: 404 })
  }

  const result = await syncSubscriberToKit(
    { emailAddress: "alex@example.com", firstName: "Alex" },
    { fetchImpl, config: enabledConfig }
  )

  assert.equal(result.ok, true)
  assert.deepEqual(requestedUrls, [
    `${KIT_API_BASE_URL}/v4/subscribers`,
    `${KIT_API_BASE_URL}/v4/forms/9811927/subscribers`,
  ])
})

test("syncSubscriberToKit skips form add when newsletter form id is unset", async () => {
  const requestedUrls: string[] = []

  const fetchImpl = async (url: string | URL | Request) => {
    requestedUrls.push(String(url))
    return new Response(
      JSON.stringify({
        subscriber: {
          id: 42,
          first_name: null,
          email_address: "alex@example.com",
          state: "active",
          created_at: "2026-01-01T00:00:00Z",
          fields: {},
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  }

  const result = await syncSubscriberToKit(
    { emailAddress: "alex@example.com", firstName: null },
    {
      fetchImpl,
      config: { ...enabledConfig, newsletterFormId: null },
    }
  )

  assert.equal(result.ok, true)
  assert.deepEqual(requestedUrls, [`${KIT_API_BASE_URL}/v4/subscribers`])
})

test("syncSubscriberToKit preserves subscriber id when form add fails", async () => {
  const fetchImpl = async (url: string | URL | Request) => {
    if (String(url).endsWith("/v4/subscribers")) {
      return new Response(
        JSON.stringify({
          subscriber: {
            id: 42,
            first_name: null,
            email_address: "alex@example.com",
            state: "active",
            created_at: "2026-01-01T00:00:00Z",
            fields: {},
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(JSON.stringify({ errors: ["Form unavailable"] }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    })
  }

  const result = await syncSubscriberToKit(
    { emailAddress: "alex@example.com", firstName: null },
    { fetchImpl, config: enabledConfig }
  )

  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.subscriberId, 42)
    assert.equal(result.error, "Form unavailable")
  }
})
