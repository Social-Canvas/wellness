/**
 * Pure helpers for free-claim digital products (Integration Journal).
 * Purchase mode is always resolved server-side from canonical product rows.
 * Kept free of path-alias / extension-sensitive sibling imports so Node tests
 * can load this module directly (same pattern as membership-plan-cta-state).
 */

export const PRODUCT_FILES_BUCKET = "product-files" as const
export const PRODUCT_DOWNLOAD_URL_EXPIRES_SECONDS = 900
export const EBOOK_DOWNLOADS_PATH = "/dashboard/downloads" as const
export const CLEAN_LIVING_RECIPES_SLUG = "ebook-1" as const

export type OrderStatusForDownload =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "cancelled"

export const INTEGRATION_JOURNAL_SLUG = "elevate-integration-journal" as const

export const INTEGRATION_JOURNAL_TITLE =
  "The Elevate Integration Journal" as const

export const INTEGRATION_JOURNAL_TAGLINE =
  "Regulate. Reflect. Reconnect." as const

export const INTEGRATION_JOURNAL_DESCRIPTION =
  "A guided digital journal for reflection, nervous-system awareness and integration throughout your Elevate journey." as const

export const INTEGRATION_JOURNAL_OBJECT_PATH =
  "digital-products/elevate-integration-journal/Elevate-Integration-Journal.pdf" as const

export const INTEGRATION_JOURNAL_CUSTOMER_FILENAME =
  "Elevate-Integration-Journal.pdf" as const

export const INTEGRATION_JOURNAL_SHOP_PATH =
  `/shop/${INTEGRATION_JOURNAL_SLUG}` as const

export type ProductPurchaseMode = "paid" | "free_claim" | "enquiry"

export type ProductEntitlementSource =
  | "free_claim"
  | "purchase"
  | "included"
  | "complimentary"

export type DownloadSourceLabel =
  | "Purchased"
  | "Free resource"
  | "Included"
  | "Complimentary"

/**
 * Explicit post-auth return allowlist for claim/shop flows.
 * Arbitrary absolute URLs and unknown paths fall back to the dashboard.
 */
export const SAFE_AUTH_RETURN_PATHS = [
  "/dashboard",
  "/dashboard/downloads",
  "/dashboard/library",
  "/dashboard/account",
  INTEGRATION_JOURNAL_SHOP_PATH,
  `/shop/${CLEAN_LIVING_RECIPES_SLUG}`,
  "/shop",
  "/programs",
  "/certificate-name",
] as const

export function isProductPurchaseMode(value: unknown): value is ProductPurchaseMode {
  return value === "paid" || value === "free_claim" || value === "enquiry"
}

/**
 * Browser-supplied purchase mode is ignored — only the server canonical mode wins.
 */
export function resolveCanonicalPurchaseMode(input: {
  serverPurchaseMode: ProductPurchaseMode
  browserPurchaseMode?: string | null
}): ProductPurchaseMode {
  void input.browserPurchaseMode
  return input.serverPurchaseMode
}

export function isFreeClaimProduct(input: {
  purchaseMode: ProductPurchaseMode
  priceAmount?: number
}): boolean {
  // Never infer free status from price alone.
  return input.purchaseMode === "free_claim"
}

export function mayCreateStripeCheckoutForProduct(input: {
  purchaseMode: ProductPurchaseMode
}): boolean {
  return input.purchaseMode === "paid"
}

export function resolveSafeAuthReturnPath(
  nextRaw: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!nextRaw || !nextRaw.startsWith("/") || nextRaw.startsWith("//")) {
    return fallback
  }

  const pathOnly = nextRaw.split("?")[0] ?? nextRaw
  const allowed = (SAFE_AUTH_RETURN_PATHS as readonly string[]).some(
    (allowedPath) =>
      pathOnly === allowedPath || pathOnly.startsWith(`${allowedPath}/`)
  )

  return allowed ? nextRaw : fallback
}

export function buildSignedOutClaimLoginHref(productShopPath: string): string {
  const safeReturn = resolveSafeAuthReturnPath(
    productShopPath,
    INTEGRATION_JOURNAL_SHOP_PATH
  )
  return `/login?next=${encodeURIComponent(safeReturn)}`
}

export type FreeClaimCtaState = {
  isAuthenticated: boolean
  isClaimed: boolean
  purchaseMode: ProductPurchaseMode
  productSlug: string
}

export type FreeClaimCta = {
  showPrice: boolean
  priceLabel: "Free" | null
  badge: "free" | "claimed" | null
  badgeLabel: string | null
  primaryLabel: string
  href: string
  action: "login" | "claim" | "download" | "none"
}

export function resolveFreeClaimCta(input: FreeClaimCtaState): FreeClaimCta {
  const shopPath = `/shop/${input.productSlug}`

  if (!isFreeClaimProduct({ purchaseMode: input.purchaseMode })) {
    return {
      showPrice: false,
      priceLabel: null,
      badge: null,
      badgeLabel: null,
      primaryLabel: "View product",
      href: shopPath,
      action: "none",
    }
  }

  if (input.isClaimed) {
    return {
      showPrice: false,
      priceLabel: null,
      badge: "claimed",
      badgeLabel: "Added to your downloads",
      primaryLabel: "View in Downloads",
      href: EBOOK_DOWNLOADS_PATH,
      action: "download",
    }
  }

  if (!input.isAuthenticated) {
    return {
      showPrice: true,
      priceLabel: "Free",
      badge: "free",
      badgeLabel: "Free",
      primaryLabel: "Get free journal",
      href: buildSignedOutClaimLoginHref(shopPath),
      action: "login",
    }
  }

  return {
    showPrice: true,
    priceLabel: "Free",
    badge: "free",
    badgeLabel: "Free",
    primaryLabel: "Get free journal",
    href: shopPath,
    action: "claim",
  }
}

export function resolveDownloadSourceLabel(
  source: ProductEntitlementSource | "paid_order"
): DownloadSourceLabel {
  if (source === "free_claim") {
    return "Free resource"
  }
  if (source === "included") {
    return "Included"
  }
  if (source === "complimentary") {
    return "Complimentary"
  }
  return "Purchased"
}

export type UnifiedDownloadAuthInput = {
  isAuthenticated: boolean
  orderStatuses: OrderStatusForDownload[]
  hasProductEntitlement: boolean
  requestedStorageBucket?: string | null
  requestedStoragePath?: string | null
}

export type UnifiedDownloadAuthDecision =
  | { allowed: true }
  | {
      allowed: false
      reason: "unauthenticated" | "not_entitled" | "arbitrary_path_rejected"
    }

/**
 * Paid order OR valid product entitlement (free claim / included) may download.
 * Browser-supplied storage paths are always rejected.
 */
export function decideUnifiedProductDownloadAccess(
  input: UnifiedDownloadAuthInput
): UnifiedDownloadAuthDecision {
  if (
    input.requestedStorageBucket != null ||
    input.requestedStoragePath != null
  ) {
    return { allowed: false, reason: "arbitrary_path_rejected" }
  }

  if (!input.isAuthenticated) {
    return { allowed: false, reason: "unauthenticated" }
  }

  const hasPaidOrder = input.orderStatuses.some((status) => status === "paid")
  if (hasPaidOrder || input.hasProductEntitlement) {
    return { allowed: true }
  }

  return { allowed: false, reason: "not_entitled" }
}

export function canClaimPublishedFreeProduct(input: {
  isAuthenticated: boolean
  productStatus: string
  purchaseMode: ProductPurchaseMode
  alreadyEntitled: boolean
}):
  | { ok: true }
  | {
      ok: false
      reason:
        | "unauthenticated"
        | "unpublished"
        | "not_free_claim"
        | "already_claimed"
    } {
  if (!input.isAuthenticated) {
    return { ok: false, reason: "unauthenticated" }
  }
  if (input.productStatus !== "published") {
    return { ok: false, reason: "unpublished" }
  }
  if (input.purchaseMode !== "free_claim") {
    return { ok: false, reason: "not_free_claim" }
  }
  if (input.alreadyEntitled) {
    return { ok: false, reason: "already_claimed" }
  }
  return { ok: true }
}

/** Claiming never creates membership / subscription / course access records. */
export function freeClaimCreatesMembershipAccess(): false {
  return false
}

export function freeClaimCreatesStripeRecords(): false {
  return false
}

export function freeClaimCreatesPaidOrder(): false {
  return false
}

export function freeClaimLoadingLabel(): string {
  return "Adding to your downloads…"
}

export function isJournalStoragePathPubliclyTracked(
  serializedPublicPayload: string
): boolean {
  return (
    serializedPublicPayload.includes(INTEGRATION_JOURNAL_OBJECT_PATH) ||
    serializedPublicPayload.includes(`${PRODUCT_FILES_BUCKET}/`)
  )
}

export function isShortLivedJournalDownloadTtl(expiresInSeconds: number): boolean {
  return (
    expiresInSeconds > 0 && expiresInSeconds <= PRODUCT_DOWNLOAD_URL_EXPIRES_SECONDS
  )
}
