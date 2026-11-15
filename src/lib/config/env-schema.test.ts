import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..")

test("production boot does not require a GHL API key", () => {
  const env = readFileSync(join(root, "src/lib/config/env.ts"), "utf8")
  const example = readFileSync(join(root, ".env.example"), "utf8")
  assert.doesNotMatch(env, /GHL_API_KEY/)
  assert.doesNotMatch(example, /^GHL_API_KEY=/m)
  assert.match(example, /does not read GHL_API_KEY/)
})
