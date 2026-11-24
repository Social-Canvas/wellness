import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { normalizePurchaserEmail } from "./guest-purchaser-email.ts"

describe("guest purchaser email", () => {
  it("normalizes checkout email without inventing a password", () => {
    assert.equal(normalizePurchaserEmail("  Buyer@Example.com "), "buyer@example.com")
    assert.equal(normalizePurchaserEmail("not-an-email"), null)
  })
})
