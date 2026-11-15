import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import {
  buildSiteMediaPath,
  safePdfFileName,
  siteMediaPathFromPublicUrl,
  validateImageUpload,
  validateProductPdf,
} from "./validation.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..")

test("image uploads accept safe types and reject oversized or unknown files", () => {
  assert.equal(validateImageUpload({ mimeType: "image/png", sizeBytes: 1024 }), null)
  assert.match(validateImageUpload({ mimeType: "image/svg+xml", sizeBytes: 1024 }) ?? "", /JPEG/)
  assert.match(
    validateImageUpload({ mimeType: "image/jpeg", sizeBytes: 6 * 1024 * 1024 }) ?? "",
    /5 MB/
  )
  assert.match(validateProductPdf({ mimeType: "text/html", sizeBytes: 10 }) ?? "", /PDF/)
})

test("stored image paths are unique and only site-media URLs can be deleted", () => {
  const first = buildSiteMediaPath("content", "image/webp")
  const second = buildSiteMediaPath("content", "image/webp")
  assert.ok(first?.startsWith("content/"))
  assert.ok(first?.endsWith(".webp"))
  assert.notEqual(first, second)
  assert.equal(buildSiteMediaPath("../etc", "image/png"), null)
  assert.equal(
    siteMediaPathFromPublicUrl(
      "https://example.supabase.co/storage/v1/object/public/site-media/content/photo.jpg"
    ),
    "content/photo.jpg"
  )
  assert.equal(siteMediaPathFromPublicUrl("https://example.com/photo.jpg"), null)
  assert.equal(safePdfFileName("My Journal!.pdf"), "My-Journal.pdf")
})

test("media uploads are staff-only and do not use a public write policy", () => {
  const service = readFileSync(join(root, "src/features/media/services/media.service.ts"), "utf8")
  const migration = readFileSync(
    join(root, "supabase/migrations/20261115120000_site_content_and_media.sql"),
    "utf8"
  )
  assert.match(service, /requireStaffActor/)
  assert.match(migration, /revoke all on table public.media_assets/)
  assert.match(migration, /site-media/)
  assert.doesNotMatch(migration, /for insert[\s\S]*to anon/)
})
