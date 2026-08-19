import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { checkoutConsentSchema } from "../schemas/consent.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..")

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

test("checkout consent schema defaults marketingOptIn to false", () => {
  const parsed = checkoutConsentSchema.parse({
    fullName: "Alex Member",
    email: "alex@example.com",
    type: "membership",
    planSlug: "elevated-reset",
    interval: "monthly",
  })

  assert.equal(parsed.marketingOptIn, false)
})

test("checkout action persists marketing consent only when opted in", () => {
  const actionSource = readSrc("features/checkout/actions/checkout.actions.ts")

  assert.match(actionSource, /parsed\.data\.marketingOptIn/)
  assert.match(actionSource, /recordCheckoutMarketingConsent/)
  assert.match(actionSource, /Marketing consent and Kit sync must never block checkout/)
})

test("checkout action requires explicit marketingOptIn before recording consent", () => {
  const actionSource = readSrc("features/checkout/actions/checkout.actions.ts")

  assert.match(actionSource, /if \(parsed\.data\.marketingOptIn\)/)
  assert.doesNotMatch(actionSource, /marketingOptIn:\s*true/)
})

test("Kit integration module keeps api.kit.com server-side only", () => {
  const clientSource = readSrc("server/integrations/kit/kit.pure.ts")
  const configSource = readSrc("server/integrations/kit/kit.pure.ts")
  const clientWrapper = readSrc("server/integrations/kit/client.ts")

  assert.match(clientWrapper, /server-only/)
  assert.match(clientSource, /X-Kit-Api-Key/)
  assert.match(clientSource, /KIT_API_BASE_URL = "https:\/\/api\.kit\.com"/)
  assert.match(clientSource, /\/v4\/subscribers/)
  assert.match(clientSource, /\/v4\/forms\/\$\{input\.formId\}\/subscribers/)
  assert.match(configSource, /test_environment/)
  assert.doesNotMatch(clientSource, /NEXT_PUBLIC_/)
})

test("marketing consent service supports non-account holders and idempotent re-consent", () => {
  const serviceSource = readSrc("server/services/marketing-consent.service.ts")

  assert.match(serviceSource, /user_id: input\.userId/)
  assert.match(serviceSource, /\.eq\("email", normalizedEmail\)/)
  assert.match(serviceSource, /existing\.user_id \?\? input\.userId/)
  assert.match(serviceSource, /existing\.status === "unsubscribed"/)
  assert.doesNotMatch(serviceSource, /marketingOptIn/)
})

test("checkout action does not call Kit when marketingOptIn is false", () => {
  const actionSource = readSrc("features/checkout/actions/checkout.actions.ts")

  assert.match(actionSource, /if \(parsed\.data\.marketingOptIn\)/)
  assert.doesNotMatch(actionSource, /recordCheckoutMarketingConsent\([\s\S]*?\)[\s\S]*?if \(parsed\.data\.marketingOptIn\)/)
})
