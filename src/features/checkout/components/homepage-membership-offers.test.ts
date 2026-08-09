import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8")
}

describe("HomepageMembershipOffers", () => {
  it("wires Monthly/Annual toggle and Most Popular on homepage memberships", () => {
    const home = read("../../app/(public)/page.tsx")
    const component = read("components/homepage-membership-offers.tsx")

    assert.match(home, /HomepageMembershipOffers/)
    assert.match(home, /parseBillingParam/)
    assert.match(component, /MembershipBillingToggle/)
    assert.match(component, /Most popular/)
    assert.match(component, /getMembershipPriceQuote/)
    assert.match(component, /interval: billing === "annual" \? "yearly" : "monthly"/)
    assert.match(component, /featured \? "border-2 border-blue"/)
  })

  it("does not hardcode monthly-only homepage membership prices", () => {
    const home = read("../../app/(public)/page.tsx")
    assert.doesNotMatch(home, /MEMBERSHIP_CARDS/)
    assert.doesNotMatch(home, /\/ month<\/small>/)
  })
})
