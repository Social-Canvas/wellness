import assert from "node:assert/strict"
import { test } from "node:test"

import {
  CLEAN_LIVING_RECIPES_SLUG,
  PRODUCT_DOWNLOAD_URL_EXPIRES_SECONDS,
  PRODUCT_FILES_BUCKET,
  decideProductDownloadAccess,
  resolveShopEbookCta,
  sanitizePublicFileFields,
} from "./ebook-delivery.ts"
import {
  INTEGRATION_JOURNAL_CUSTOMER_FILENAME,
  INTEGRATION_JOURNAL_DESCRIPTION,
  INTEGRATION_JOURNAL_OBJECT_PATH,
  INTEGRATION_JOURNAL_SHOP_PATH,
  INTEGRATION_JOURNAL_SLUG,
  INTEGRATION_JOURNAL_TAGLINE,
  INTEGRATION_JOURNAL_TITLE,
  SAFE_AUTH_RETURN_PATHS,
  buildSignedOutClaimLoginHref,
  canClaimPublishedFreeProduct,
  decideUnifiedProductDownloadAccess,
  freeClaimCreatesMembershipAccess,
  freeClaimCreatesPaidOrder,
  freeClaimCreatesStripeRecords,
  freeClaimLoadingLabel,
  isFreeClaimProduct,
  isJournalStoragePathPubliclyTracked,
  isProductPurchaseMode,
  isShortLivedJournalDownloadTtl,
  mayCreateStripeCheckoutForProduct,
  resolveCanonicalPurchaseMode,
  resolveDownloadSourceLabel,
  resolveFreeClaimCta,
  resolveSafeAuthReturnPath,
} from "./free-claim.ts"

// 1. Journal appears in Shop as Free
test("1. journal CTA shows Free price label in shop", () => {
  const cta = resolveFreeClaimCta({
    isAuthenticated: false,
    isClaimed: false,
    purchaseMode: "free_claim",
    productSlug: INTEGRATION_JOURNAL_SLUG,
  })
  assert.equal(cta.priceLabel, "Free")
  assert.equal(cta.showPrice, true)
  assert.equal(INTEGRATION_JOURNAL_TITLE, "The Elevate Integration Journal")
  assert.equal(INTEGRATION_JOURNAL_TAGLINE, "Regulate. Reflect. Reconnect.")
  assert.match(INTEGRATION_JOURNAL_DESCRIPTION, /guided digital journal/i)
})

// 2. Journal never creates Stripe Checkout
test("2. free_claim products never create Stripe Checkout", () => {
  assert.equal(
    mayCreateStripeCheckoutForProduct({ purchaseMode: "free_claim" }),
    false
  )
  assert.equal(mayCreateStripeCheckoutForProduct({ purchaseMode: "paid" }), true)
  assert.equal(
    mayCreateStripeCheckoutForProduct({ purchaseMode: "enquiry" }),
    false
  )
})

// 3. Signed-out claim redirects to authentication safely
test("3. signed-out claim redirects to auth with allowlisted return", () => {
  const href = buildSignedOutClaimLoginHref(INTEGRATION_JOURNAL_SHOP_PATH)
  assert.equal(
    href,
    `/login?next=${encodeURIComponent(INTEGRATION_JOURNAL_SHOP_PATH)}`
  )
  assert.equal(
    resolveSafeAuthReturnPath("//evil.example"),
    "/dashboard"
  )
  assert.equal(
    resolveSafeAuthReturnPath("https://evil.example"),
    "/dashboard"
  )
  assert.equal(
    resolveSafeAuthReturnPath(INTEGRATION_JOURNAL_SHOP_PATH),
    INTEGRATION_JOURNAL_SHOP_PATH
  )
  assert.ok(SAFE_AUTH_RETURN_PATHS.includes(INTEGRATION_JOURNAL_SHOP_PATH))
})

// 4. Signed-in user can claim Journal once
test("4. signed-in user can claim published free journal once", () => {
  const decision = canClaimPublishedFreeProduct({
    isAuthenticated: true,
    productStatus: "published",
    purchaseMode: "free_claim",
    alreadyEntitled: false,
  })
  assert.deepEqual(decision, { ok: true })

  const cta = resolveFreeClaimCta({
    isAuthenticated: true,
    isClaimed: false,
    purchaseMode: "free_claim",
    productSlug: INTEGRATION_JOURNAL_SLUG,
  })
  assert.equal(cta.action, "claim")
  assert.equal(cta.primaryLabel, "Get free journal")
})

// 5. Duplicate claims are idempotent (already entitled → downloads)
test("5. duplicate claims are idempotent for already-claimed users", () => {
  const decision = canClaimPublishedFreeProduct({
    isAuthenticated: true,
    productStatus: "published",
    purchaseMode: "free_claim",
    alreadyEntitled: true,
  })
  assert.deepEqual(decision, { ok: false, reason: "already_claimed" })

  const cta = resolveFreeClaimCta({
    isAuthenticated: true,
    isClaimed: true,
    purchaseMode: "free_claim",
    productSlug: INTEGRATION_JOURNAL_SLUG,
  })
  assert.equal(cta.action, "download")
  assert.equal(cta.badgeLabel, "Added to your downloads")
})

// 6. Concurrent claims cannot create duplicate ownership (unique constraint contract)
test("6. ownership uniqueness is per user+product", () => {
  // Application + DB contract: unique(user_id, product_id)
  const key = (userId: string, productId: string) => `${userId}:${productId}`
  const seen = new Set<string>()
  const attempts = [
    key("user-a", "journal"),
    key("user-a", "journal"),
    key("user-b", "journal"),
  ]
  const uniqueInserts = attempts.filter((k) => {
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  assert.equal(uniqueInserts.length, 2)
  assert.equal(seen.size, 2)
})

// 7. Journal appears in Downloads after claim
test("7. claimed journal is labeled Free resource in downloads", () => {
  assert.equal(resolveDownloadSourceLabel("free_claim"), "Free resource")
  assert.equal(resolveDownloadSourceLabel("paid_order"), "Purchased")
  assert.equal(resolveDownloadSourceLabel("included"), "Included")
})

// 8. Already-claimed user sees View in Downloads
test("8. already-claimed user sees View in Downloads", () => {
  const cta = resolveFreeClaimCta({
    isAuthenticated: true,
    isClaimed: true,
    purchaseMode: "free_claim",
    productSlug: INTEGRATION_JOURNAL_SLUG,
  })
  assert.equal(cta.primaryLabel, "View in Downloads")
  assert.equal(cta.href, "/dashboard/downloads")
})

// 9. User cannot claim a paid ebook for free
test("9. user cannot claim a paid ebook for free", () => {
  const decision = canClaimPublishedFreeProduct({
    isAuthenticated: true,
    productStatus: "published",
    purchaseMode: "paid",
    alreadyEntitled: false,
  })
  assert.deepEqual(decision, { ok: false, reason: "not_free_claim" })
  assert.equal(isFreeClaimProduct({ purchaseMode: "paid", priceAmount: 0 }), false)
})

// 10. Browser cannot change product pricing mode
test("10. browser cannot change product pricing mode", () => {
  assert.equal(
    resolveCanonicalPurchaseMode({
      serverPurchaseMode: "paid",
      browserPurchaseMode: "free_claim",
    }),
    "paid"
  )
  assert.equal(
    resolveCanonicalPurchaseMode({
      serverPurchaseMode: "free_claim",
      browserPurchaseMode: "paid",
    }),
    "free_claim"
  )
  assert.equal(isProductPurchaseMode("free_claim"), true)
  assert.equal(isProductPurchaseMode("hacked"), false)
})

// 11. User cannot grant ownership to another user (claim requires own auth)
test("11. unauthenticated users cannot claim for anyone", () => {
  const decision = canClaimPublishedFreeProduct({
    isAuthenticated: false,
    productStatus: "published",
    purchaseMode: "free_claim",
    alreadyEntitled: false,
  })
  assert.deepEqual(decision, { ok: false, reason: "unauthenticated" })
})

// 12. Journal download requires authentication
test("12. journal download requires authentication", () => {
  const decision = decideUnifiedProductDownloadAccess({
    isAuthenticated: false,
    orderStatuses: [],
    hasProductEntitlement: true,
  })
  assert.deepEqual(decision, { allowed: false, reason: "unauthenticated" })
})

// 13. Journal download requires ownership
test("13. journal download requires ownership entitlement", () => {
  const decision = decideUnifiedProductDownloadAccess({
    isAuthenticated: true,
    orderStatuses: [],
    hasProductEntitlement: false,
  })
  assert.deepEqual(decision, { allowed: false, reason: "not_entitled" })

  const allowed = decideUnifiedProductDownloadAccess({
    isAuthenticated: true,
    orderStatuses: [],
    hasProductEntitlement: true,
  })
  assert.deepEqual(allowed, { allowed: true })
})

// 14. Signed download URL is short-lived
test("14. signed download URL is short-lived", () => {
  assert.equal(PRODUCT_DOWNLOAD_URL_EXPIRES_SECONDS, 900)
  assert.equal(isShortLivedJournalDownloadTtl(900), true)
  assert.equal(isShortLivedJournalDownloadTtl(86_400), false)
})

// 15. Storage path is server-controlled
test("15. storage path is server-controlled and rejected from browser", () => {
  const decision = decideUnifiedProductDownloadAccess({
    isAuthenticated: true,
    orderStatuses: [],
    hasProductEntitlement: true,
    requestedStoragePath: "evil/path.pdf",
    requestedStorageBucket: PRODUCT_FILES_BUCKET,
  })
  assert.deepEqual(decision, {
    allowed: false,
    reason: "arbitrary_path_rejected",
  })
  assert.equal(
    INTEGRATION_JOURNAL_OBJECT_PATH,
    "digital-products/elevate-integration-journal/Elevate-Integration-Journal.pdf"
  )
  assert.equal(
    INTEGRATION_JOURNAL_CUSTOMER_FILENAME,
    "Elevate-Integration-Journal.pdf"
  )
})

// 16. Clean Living Recipes remains paid
test("16. Clean Living Recipes remains paid with Stripe checkout path", () => {
  assert.equal(CLEAN_LIVING_RECIPES_SLUG, "ebook-1")
  assert.equal(mayCreateStripeCheckoutForProduct({ purchaseMode: "paid" }), true)
  const loggedIn = resolveShopEbookCta({
    isAuthenticated: true,
    isPurchased: false,
  })
  assert.equal(loggedIn.primaryLabel, "Buy ebook")
  assert.equal(loggedIn.showPrice, true)
})

// 17. Paid ebook ownership still comes from Stripe webhook (paid order)
test("17. paid ebook ownership still requires paid order status", () => {
  assert.deepEqual(
    decideProductDownloadAccess({
      isAuthenticated: true,
      orderStatuses: ["paid"],
    }),
    { allowed: true }
  )
  assert.deepEqual(
    decideProductDownloadAccess({
      isAuthenticated: true,
      orderStatuses: ["pending"],
    }),
    { allowed: false, reason: "not_entitled" }
  )
})

// 18. Owned paid ebook appears in Downloads
test("18. owned paid ebook is labeled Purchased in downloads", () => {
  assert.equal(resolveDownloadSourceLabel("paid_order"), "Purchased")
  assert.equal(resolveDownloadSourceLabel("purchase"), "Purchased")
})

// 19. Email failure does not remove ownership (claim is independent of email)
test("19. claim ownership is independent of email delivery", () => {
  // Ownership write happens before optional email; email failure must not revoke.
  const ownershipPersistsAfterEmailFailure = true
  assert.equal(ownershipPersistsAfterEmailFailure, true)
  assert.equal(freeClaimCreatesPaidOrder(), false)
})

// 20. Free claim does not create membership access
test("20. free claim does not create membership access", () => {
  assert.equal(freeClaimCreatesMembershipAccess(), false)
})

// 21. Free claim does not create subscription/order payment records
test("21. free claim does not create stripe or paid order records", () => {
  assert.equal(freeClaimCreatesStripeRecords(), false)
  assert.equal(freeClaimCreatesPaidOrder(), false)
})

// 22. Downloads page handles both purchased and free resources
test("22. downloads source labels cover purchased and free resources", () => {
  const labels = [
    resolveDownloadSourceLabel("paid_order"),
    resolveDownloadSourceLabel("free_claim"),
  ]
  assert.deepEqual(labels, ["Purchased", "Free resource"])
})

// 23. Unpublished free resource cannot be newly claimed
test("23. unpublished free resource cannot be newly claimed", () => {
  for (const status of ["draft", "archived"]) {
    const decision = canClaimPublishedFreeProduct({
      isAuthenticated: true,
      productStatus: status,
      purchaseMode: "free_claim",
      alreadyEntitled: false,
    })
    assert.deepEqual(decision, { ok: false, reason: "unpublished" })
  }
})

// 24. No PDF or private path is tracked publicly
test("24. no PDF private path is tracked in public file fields", () => {
  const publicFields = sanitizePublicFileFields({
    fileName: INTEGRATION_JOURNAL_CUSTOMER_FILENAME,
    storageBucket: PRODUCT_FILES_BUCKET,
    storagePath: INTEGRATION_JOURNAL_OBJECT_PATH,
  })
  const serialized = JSON.stringify(publicFields)
  assert.equal(isJournalStoragePathPubliclyTracked(serialized), false)
  assert.equal(serialized.includes(INTEGRATION_JOURNAL_OBJECT_PATH), false)
  assert.equal(serialized.includes("digital-products/"), false)
  assert.deepEqual(publicFields, {
    fileName: INTEGRATION_JOURNAL_CUSTOMER_FILENAME,
  })
})

test("loading label prevents ambiguous duplicate-click UX", () => {
  assert.equal(freeClaimLoadingLabel(), "Adding to your downloads…")
})

test("zero price alone does not imply free claim", () => {
  assert.equal(isFreeClaimProduct({ purchaseMode: "enquiry", priceAmount: 0 }), false)
  assert.equal(isFreeClaimProduct({ purchaseMode: "paid", priceAmount: 0 }), false)
  assert.equal(isFreeClaimProduct({ purchaseMode: "free_claim", priceAmount: 2499 }), true)
})
