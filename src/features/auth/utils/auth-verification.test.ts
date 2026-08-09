import assert from "node:assert/strict"
import test from "node:test"

import {
  SAFE_AUTH_RETURN_PATHS,
  resolveSafeAuthReturnPath,
} from "../../shop/utils/free-claim.ts"
import {
  authCallbackErrorMessage,
  buildAuthCallbackUrl,
  mapAuthCallbackProviderError,
  normalizeAppOrigin,
  resolveCanonicalAppUrl,
} from "../../../lib/config/app-url.ts"

test("auth redirect canonical strips slash and forces https on vercel", () => {
  assert.equal(
    buildAuthCallbackUrl(
      "/dashboard",
      "http://wellness-topaz-chi.vercel.app/"
    ),
    "https://wellness-topaz-chi.vercel.app/auth/callback?next=%2Fdashboard"
  )
})

test("password recovery next path is allowlisted", () => {
  assert.ok(SAFE_AUTH_RETURN_PATHS.includes("/reset-password"))
  assert.equal(
    resolveSafeAuthReturnPath("/reset-password"),
    "/reset-password"
  )
})

test("open redirects are rejected for auth next param", () => {
  assert.equal(
    resolveSafeAuthReturnPath("https://evil.example"),
    "/dashboard"
  )
  assert.equal(resolveSafeAuthReturnPath("//evil.example"), "/dashboard")
  assert.equal(resolveSafeAuthReturnPath("/checkout"), "/dashboard")
})

test("onboarding vs dashboard destinations stay relative-safe", () => {
  assert.equal(
    resolveSafeAuthReturnPath("/certificate-name?next=%2Fdashboard"),
    "/certificate-name?next=%2Fdashboard"
  )
  assert.equal(resolveSafeAuthReturnPath("/dashboard/library"), "/dashboard/library")
})

test("friendly auth errors never include raw tokens", () => {
  const message = authCallbackErrorMessage(
    mapAuthCallbackProviderError({
      errorDescription: "Token token_hash=abc code=xyz project=atgvuqjmrjcjjiwpodwn",
    })
  )
  assert.doesNotMatch(message, /token_hash|=abc|atgvuqj|code=xyz/i)
  assert.match(message, /confirm|verification|email|link/i)
})

test("production prefers configured app URL over vercel preview host", () => {
  assert.equal(
    resolveCanonicalAppUrl({
      appUrl: "https://wellness-topaz-chi.vercel.app",
      vercelUrl: "some-preview.vercel.app",
      vercelEnv: "production",
      nodeEnv: "production",
    }),
    "https://wellness-topaz-chi.vercel.app"
  )
  assert.equal(
    normalizeAppOrigin("https://wellness-topaz-chi.vercel.app///"),
    "https://wellness-topaz-chi.vercel.app"
  )
})
