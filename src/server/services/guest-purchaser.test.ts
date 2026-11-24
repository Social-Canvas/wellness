import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"

import { normalizePurchaserEmail } from "./guest-purchaser-email.ts"

const ROOT = join(import.meta.dirname, "../../..")

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8")
}

describe("guest purchaser email", () => {
  it("normalizes checkout email without inventing a password", () => {
    assert.equal(normalizePurchaserEmail("  Buyer@Example.com "), "buyer@example.com")
    assert.equal(normalizePurchaserEmail("not-an-email"), null)
  })

  it("reports a new account as created even when the signup trigger made the profile", () => {
    const service = read("src/server/services/guest-purchaser.ts")
    assert.match(service, /return \{ profileId: profile\.data\.id, created \}/)
    assert.match(service, /return \{ profileId: retry\.data\.id, created \}/)
  })
})

describe("product checkout promotion codes", () => {
  it("enables Stripe promotion codes on logged-in and guest product checkout only", () => {
    const shop = read("src/features/shop/services/shop.service.ts")
    assert.equal(shop.match(/allow_promotion_codes: true/g)?.length, 2)
    const billing = read("src/features/billing/services/billing.service.ts")
    assert.doesNotMatch(billing, /allow_promotion_codes/)
  })

  it("treats a completed 100%-off checkout as a paid $0 order", () => {
    const shop = read("src/features/shop/services/shop.service.ts")
    assert.match(
      shop,
      /session\.payment_status === "no_payment_required" && session\.status === "complete"/
    )
    assert.match(shop, /const amountPaid = session\.amount_total \?\? product\.price_amount/)
  })
})
