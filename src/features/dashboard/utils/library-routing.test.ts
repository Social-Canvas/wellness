import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("obsolete /library paths redirect to the member library", () => {
  const config = readFileSync(
    new URL("../../../../next.config.ts", import.meta.url),
    "utf8"
  )
  assert.match(config, /source: "\/library"/)
  assert.match(config, /destination: "\/dashboard\/library"/)
  assert.match(config, /source: "\/library\/:path\*"/)
  assert.match(config, /destination: "\/dashboard\/library\/:path\*"/)
})

test("member navigation does not offer certificates", () => {
  const navigation = readFileSync(
    new URL("../constants/navigation.ts", import.meta.url),
    "utf8"
  )
  const home = readFileSync(
    new URL("../components/dashboard-home-actions.tsx", import.meta.url),
    "utf8"
  )
  assert.doesNotMatch(navigation, /label: "Certificates"/)
  assert.doesNotMatch(home, /\/dashboard\/certificates/)
})
