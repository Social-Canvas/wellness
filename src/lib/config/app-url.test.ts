import assert from "node:assert/strict"
import test from "node:test"

import {
  authCallbackErrorMessage,
  buildAuthCallbackUrl,
  isAuthCallbackErrorCode,
  mapAuthCallbackProviderError,
  normalizeAppOrigin,
  resolveCanonicalAppUrl,
} from "./app-url.ts"

test("normalizeAppOrigin strips trailing slash", () => {
  assert.equal(
    normalizeAppOrigin("https://wellness-topaz-chi.vercel.app/"),
    "https://wellness-topaz-chi.vercel.app"
  )
})

test("normalizeAppOrigin upgrades http vercel hosts to https", () => {
  assert.equal(
    normalizeAppOrigin("http://wellness-topaz-chi.vercel.app/"),
    "https://wellness-topaz-chi.vercel.app"
  )
})

test("resolveCanonicalAppUrl prefers NEXT_PUBLIC_APP_URL over VERCEL_URL", () => {
  assert.equal(
    resolveCanonicalAppUrl({
      appUrl: "https://wellness-topaz-chi.vercel.app/",
      vercelUrl: "preview-xyz.vercel.app",
      vercelEnv: "preview",
      nodeEnv: "production",
    }),
    "https://wellness-topaz-chi.vercel.app"
  )
})

test("resolveCanonicalAppUrl uses VERCEL_URL only when app URL unset on preview", () => {
  assert.equal(
    resolveCanonicalAppUrl({
      appUrl: null,
      vercelUrl: "my-preview.vercel.app",
      vercelEnv: "preview",
      nodeEnv: "production",
    }),
    "https://my-preview.vercel.app"
  )
})

test("resolveCanonicalAppUrl falls back to localhost outside production", () => {
  assert.equal(
    resolveCanonicalAppUrl({
      appUrl: null,
      vercelUrl: null,
      vercelEnv: null,
      nodeEnv: "development",
    }),
    "http://localhost:3000"
  )
})

test("buildAuthCallbackUrl encodes next and avoids double slash", () => {
  assert.equal(
    buildAuthCallbackUrl(
      "/dashboard",
      "https://wellness-topaz-chi.vercel.app/"
    ),
    "https://wellness-topaz-chi.vercel.app/auth/callback?next=%2Fdashboard"
  )
})

test("mapAuthCallbackProviderError classifies expired and used links", () => {
  assert.equal(
    mapAuthCallbackProviderError({ errorCode: "otp_expired" }),
    "auth_callback_expired"
  )
  assert.equal(
    mapAuthCallbackProviderError({
      exchangeMessage: "flow_state_not_found",
    }),
    "auth_callback_used"
  )
})

test("auth callback error messages never leak tokens or project refs", () => {
  const codes = [
    "auth_callback_missing_code",
    "auth_callback_failed",
    "auth_callback_expired",
    "auth_callback_used",
    "auth_callback_denied",
    "auth_callback_invalid",
  ] as const

  for (const code of codes) {
    const message = authCallbackErrorMessage(code)
    assert.equal(isAuthCallbackErrorCode(code), true)
    assert.doesNotMatch(message, /token|atgvuqj|supabase\.co|stack|eyJ/i)
  }
})
