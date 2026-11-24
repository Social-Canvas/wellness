import assert from "node:assert/strict"
import { test } from "node:test"

import {
  mergeUtm,
  readUtmFromSearchParams,
  sanitizeUtmValue,
  utmToMetadata,
} from "./utm.ts"

test("utm values are trimmed and length-limited", () => {
  assert.equal(sanitizeUtmValue("  newsletter \n"), "newsletter")
  assert.equal(sanitizeUtmValue("   "), null)
  assert.equal(sanitizeUtmValue("a".repeat(200))?.length, 120)
})

test("search params keep only the five attribution fields", () => {
  const params = new URLSearchParams(
    "utm_source=kit&utm_medium=email&utm_campaign=reset&utm_content=hero&utm_term=breath&email=person@example.com"
  )
  assert.deepEqual(readUtmFromSearchParams(params), {
    utm_source: "kit",
    utm_medium: "email",
    utm_campaign: "reset",
    utm_content: "hero",
    utm_term: "breath",
  })
})

test("first touch attribution is not overwritten", () => {
  const merged = mergeUtm(
    { utm_source: "instagram", utm_campaign: "launch" },
    { utm_source: "google", utm_medium: "cpc" }
  )
  assert.equal(merged.utm_source, "instagram")
  assert.equal(merged.utm_medium, "cpc")
  assert.equal(merged.utm_campaign, "launch")
  assert.deepEqual(utmToMetadata(merged), {
    utm_source: "instagram",
    utm_medium: "cpc",
    utm_campaign: "launch",
  })
})
