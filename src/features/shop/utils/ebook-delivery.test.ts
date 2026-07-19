import assert from "node:assert/strict"
import { test } from "node:test"

import {
  EBOOK_LIBRARY_PATH,
  RESET_COURSE_ID,
  RESET_PRODUCT_SLUG,
  isResetPurchase,
  resolvePostPurchaseDestination,
} from "../../checkout/constants/destinations.ts"
import {
  CLEAN_LIVING_RECIPES_CUSTOMER_FILENAME,
  CLEAN_LIVING_RECIPES_OBJECT_PATH,
  CLEAN_LIVING_RECIPES_SLUG,
  EBOOK_DOWNLOADS_PATH,
  PRODUCT_DOWNLOAD_URL_EXPIRES_SECONDS,
  PRODUCT_FILES_BUCKET,
  decideIdempotentUpload,
  decideProductDownloadAccess,
  downloadResponseCacheControl,
  isShortLivedDownloadTtl,
  nextVersionedObjectPath,
  resolveShopEbookCta,
  sanitizePublicFileFields,
} from "./ebook-delivery.ts"

// 1. Logged-out user cannot download
test("logged-out user cannot download", () => {
  const decision = decideProductDownloadAccess({
    isAuthenticated: false,
    orderStatuses: [],
  })
  assert.deepEqual(decision, { allowed: false, reason: "unauthenticated" })
})

// 2. Logged-in non-owner cannot download
test("logged-in non-owner cannot download", () => {
  const decision = decideProductDownloadAccess({
    isAuthenticated: true,
    orderStatuses: [],
  })
  assert.deepEqual(decision, { allowed: false, reason: "not_entitled" })
})

// 3. Completed purchaser can download
test("completed purchaser can download", () => {
  const decision = decideProductDownloadAccess({
    isAuthenticated: true,
    orderStatuses: ["paid"],
  })
  assert.deepEqual(decision, { allowed: true })
})

// 4. Active valid entitlement can download (paid among mixed history)
test("active valid entitlement can download", () => {
  const decision = decideProductDownloadAccess({
    isAuthenticated: true,
    orderStatuses: ["failed", "paid", "pending"],
  })
  assert.deepEqual(decision, { allowed: true })
})

// 5. Cancelled/refunded/unpaid order cannot download
test("cancelled refunded unpaid orders cannot download", () => {
  for (const status of ["cancelled", "refunded", "pending", "failed"] as const) {
    const decision = decideProductDownloadAccess({
      isAuthenticated: true,
      orderStatuses: [status],
    })
    assert.deepEqual(decision, { allowed: false, reason: "not_entitled" })
  }
})

// 6. Signed URL is short-lived
test("signed url ttl is short-lived", () => {
  assert.equal(PRODUCT_DOWNLOAD_URL_EXPIRES_SECONDS, 900)
  assert.equal(isShortLivedDownloadTtl(PRODUCT_DOWNLOAD_URL_EXPIRES_SECONDS), true)
  assert.equal(isShortLivedDownloadTtl(60), true)
  assert.equal(isShortLivedDownloadTtl(86_400), false)
  assert.equal(isShortLivedDownloadTtl(0), false)
})

// 7. Browser cannot choose an arbitrary storage path
test("browser cannot choose an arbitrary storage path", () => {
  const decision = decideProductDownloadAccess({
    isAuthenticated: true,
    orderStatuses: ["paid"],
    requestedStorageBucket: "product-files",
    requestedStoragePath: "evil/path.pdf",
  })
  assert.deepEqual(decision, {
    allowed: false,
    reason: "arbitrary_path_rejected",
  })
})

// 8. No cross-user caching
test("download responses must not be shared-cached", () => {
  assert.equal(downloadResponseCacheControl(), "private, no-store")
})

// 9. Existing owner does not create duplicate Checkout (CTA + destination)
test("existing owner is routed to downloads instead of checkout", () => {
  const cta = resolveShopEbookCta({ isAuthenticated: true, isPurchased: true })
  assert.equal(cta.showPrice, false)
  assert.equal(cta.badge, "purchased")
  assert.equal(cta.primaryLabel, "Download ebook")
  assert.equal(cta.href, EBOOK_DOWNLOADS_PATH)
  assert.notEqual(cta.href.includes("checkout"), true)
})

// 10. Ebook Checkout destination is the ebook downloads page
test("ebook checkout destination is downloads page", () => {
  const dest = resolvePostPurchaseDestination({
    purchaseType: "product",
    productSlug: CLEAN_LIVING_RECIPES_SLUG,
    productType: "ebook",
  })
  assert.equal(dest.href, EBOOK_DOWNLOADS_PATH)
  assert.equal(dest.href, EBOOK_LIBRARY_PATH)
  assert.equal(dest.autoRedirect, false)
  assert.match(dest.label, /download/i)
})

// 11. Reset purchase destination remains the Reset course
test("reset purchase destination remains the Reset course", () => {
  const dest = resolvePostPurchaseDestination({
    purchaseType: "product",
    productSlug: RESET_PRODUCT_SLUG,
    grantedCourseId: RESET_COURSE_ID,
  })
  assert.equal(dest.href, `/dashboard/library/${RESET_COURSE_ID}`)
  assert.equal(dest.autoRedirect, true)
  assert.equal(isResetPurchase({ productSlug: CLEAN_LIVING_RECIPES_SLUG }), false)
})

// 12. Private bucket/object path is never rendered publicly
test("private bucket and object path are never rendered publicly", () => {
  const publicFields = sanitizePublicFileFields({
    fileName: CLEAN_LIVING_RECIPES_CUSTOMER_FILENAME,
    storageBucket: PRODUCT_FILES_BUCKET,
    storagePath: CLEAN_LIVING_RECIPES_OBJECT_PATH,
  })
  assert.deepEqual(publicFields, {
    fileName: CLEAN_LIVING_RECIPES_CUSTOMER_FILENAME,
  })
  assert.equal("storageBucket" in publicFields, false)
  assert.equal("storagePath" in publicFields, false)
  assert.equal(
    JSON.stringify(publicFields).includes(CLEAN_LIVING_RECIPES_OBJECT_PATH),
    false
  )
  assert.equal(JSON.stringify(publicFields).includes(PRODUCT_FILES_BUCKET), false)
})

// 13. Duplicate upload is idempotent
test("duplicate upload is idempotent", () => {
  const decision = decideIdempotentUpload({
    targetPath: CLEAN_LIVING_RECIPES_OBJECT_PATH,
    existingPath: CLEAN_LIVING_RECIPES_OBJECT_PATH,
    existingSizeBytes: 20_568_335,
    existingChecksum: "abc123",
    candidateSizeBytes: 20_568_335,
    candidateChecksum: "abc123",
  })
  assert.deepEqual(decision, { action: "reuse" })
})

// 14. Different-version upload does not silently overwrite
test("different file at path does not silently overwrite", () => {
  const conflict = decideIdempotentUpload({
    targetPath: CLEAN_LIVING_RECIPES_OBJECT_PATH,
    existingPath: CLEAN_LIVING_RECIPES_OBJECT_PATH,
    existingSizeBytes: 20_568_335,
    existingChecksum: "abc123",
    candidateSizeBytes: 20_568_335,
    candidateChecksum: "different",
  })
  assert.deepEqual(conflict, {
    action: "conflict",
    reason: "different_file_at_path",
  })

  const versioned = nextVersionedObjectPath("clean-living-recipes", 1)
  assert.equal(versioned, "clean-living-recipes/v2/clean-living-recipes.pdf")
  assert.notEqual(versioned, CLEAN_LIVING_RECIPES_OBJECT_PATH)
})

// 15. Other product behavior remains unchanged (membership + shop CTAs)
test("other product behavior remains unchanged", () => {
  const membership = resolvePostPurchaseDestination({ purchaseType: "membership" })
  assert.equal(membership.href, "/dashboard/library")

  const loggedOut = resolveShopEbookCta({
    isAuthenticated: false,
    isPurchased: false,
  })
  assert.equal(loggedOut.primaryLabel, "Get the ebook")
  assert.equal(loggedOut.showPrice, true)

  const loggedIn = resolveShopEbookCta({
    isAuthenticated: true,
    isPurchased: false,
  })
  assert.equal(loggedIn.primaryLabel, "Buy ebook")
  assert.equal(loggedIn.showPrice, true)
})
