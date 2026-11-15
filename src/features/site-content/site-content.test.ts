import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import {
  containsEmDash,
  isSafeImageValue,
  isSafeInternalHref,
  isSafeSocialUrl,
} from "./safety.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..")

test("public content links reject scripts and unknown hosts", () => {
  assert.equal(containsEmDash("Heal — now"), true)
  assert.equal(isSafeInternalHref("/programs#reset-plan"), true)
  assert.equal(isSafeInternalHref("javascript:alert(1)"), false)
  assert.equal(
    isSafeSocialUrl("global.social.instagram", "https://www.instagram.com/example"),
    true
  )
  assert.equal(isSafeSocialUrl("global.social.instagram", "https://evil.example/phish"), false)
  assert.equal(isSafeImageValue("/brand/founder-portrait.jpg"), true)
  assert.equal(isSafeImageValue("https://evil.example/pixel.png"), false)
  assert.equal(
    isSafeImageValue(
      "https://project.supabase.co/storage/v1/object/public/site-media/content/photo.jpg"
    ),
    true
  )
})

test("content save revalidates and does not treat copy as an entitlement change", () => {
  const action = readFileSync(
    join(root, "src/features/site-content/actions/site-content.actions.ts"),
    "utf8"
  )
  const registry = readFileSync(join(root, "src/features/site-content/registry.ts"), "utf8")
  const products = readFileSync(join(root, "src/features/shop/schemas/update-product.ts"), "utf8")
  assert.match(action, /updateTag\("site-content"\)/)
  assert.match(action, /revalidatePath\(path\)/)
  assert.match(registry, /Marketing text only/)
  assert.doesNotMatch(products, /stripePriceId/)
  assert.doesNotMatch(products, /slug:/)
})
