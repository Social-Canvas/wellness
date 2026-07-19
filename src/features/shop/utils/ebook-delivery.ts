/**
 * Pure helpers for protected ebook delivery (authorization, upload safety, CTA copy).
 * Storage paths are never rendered to customers — only customer-facing filenames.
 */

export const PRODUCT_FILES_BUCKET = "product-files" as const

export const CLEAN_LIVING_RECIPES_SLUG = "ebook-1" as const

export const CLEAN_LIVING_RECIPES_OBJECT_PATH =
  "clean-living-recipes/v1/clean-living-recipes.pdf" as const

export const CLEAN_LIVING_RECIPES_CUSTOMER_FILENAME =
  "Elevate-Clean-Living-Recipes.pdf" as const

/** Short-lived signed download TTL (15 minutes). */
export const PRODUCT_DOWNLOAD_URL_EXPIRES_SECONDS = 900

export const EBOOK_DOWNLOADS_PATH = "/dashboard/downloads" as const

export type OrderStatusForDownload =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "cancelled"

export type DownloadAuthInput = {
  isAuthenticated: boolean
  orderStatuses: OrderStatusForDownload[]
  requestedStorageBucket?: string | null
  requestedStoragePath?: string | null
}

export type DownloadAuthDecision =
  | { allowed: true }
  | { allowed: false; reason: "unauthenticated" | "not_entitled" | "arbitrary_path_rejected" }

/**
 * Decide whether a download may proceed. Browser-supplied bucket/path is always rejected.
 * Entitlement requires at least one paid order (cancelled/refunded/unpaid do not count).
 */
export function decideProductDownloadAccess(
  input: DownloadAuthInput
): DownloadAuthDecision {
  if (
    input.requestedStorageBucket != null ||
    input.requestedStoragePath != null
  ) {
    return { allowed: false, reason: "arbitrary_path_rejected" }
  }

  if (!input.isAuthenticated) {
    return { allowed: false, reason: "unauthenticated" }
  }

  const hasPaid = input.orderStatuses.some((status) => status === "paid")

  if (!hasPaid) {
    return { allowed: false, reason: "not_entitled" }
  }

  return { allowed: true }
}

export type UploadConflictInput = {
  targetPath: string
  existingPath: string | null
  existingSizeBytes: number | null
  existingChecksum: string | null
  candidateSizeBytes: number
  candidateChecksum: string
}

export type UploadConflictDecision =
  | { action: "upload" }
  | { action: "reuse" }
  | { action: "conflict"; reason: "different_file_at_path" }

/**
 * Idempotent upload policy: reuse identical object; never silently overwrite a different file.
 */
export function decideIdempotentUpload(
  input: UploadConflictInput
): UploadConflictDecision {
  if (!input.existingPath || input.existingPath !== input.targetPath) {
    return { action: "upload" }
  }

  if (
    input.existingChecksum &&
    input.existingChecksum === input.candidateChecksum
  ) {
    return { action: "reuse" }
  }

  if (
    input.existingSizeBytes != null &&
    input.existingChecksum == null &&
    input.existingSizeBytes === input.candidateSizeBytes
  ) {
    return { action: "reuse" }
  }

  if (
    (input.existingChecksum &&
      input.existingChecksum !== input.candidateChecksum) ||
    (input.existingSizeBytes != null &&
      input.existingSizeBytes !== input.candidateSizeBytes)
  ) {
    return { action: "conflict", reason: "different_file_at_path" }
  }

  return { action: "upload" }
}

/**
 * Versioned path helper — never overwrite v1 when content differs.
 */
export function nextVersionedObjectPath(
  basePrefix: string,
  currentVersion: number
): string {
  const next = currentVersion + 1
  return `${basePrefix}/v${next}/clean-living-recipes.pdf`
}

export type ShopEbookCtaState = {
  isAuthenticated: boolean
  isPurchased: boolean
}

export type ShopEbookCta = {
  showPrice: boolean
  badge: "price" | "purchased"
  primaryLabel: string
  href: string
}

export function resolveShopEbookCta(input: ShopEbookCtaState): ShopEbookCta {
  if (input.isPurchased) {
    return {
      showPrice: false,
      badge: "purchased",
      primaryLabel: "Download ebook",
      href: EBOOK_DOWNLOADS_PATH,
    }
  }

  if (!input.isAuthenticated) {
    return {
      showPrice: true,
      badge: "price",
      primaryLabel: "Get the ebook",
      href: `/shop/${CLEAN_LIVING_RECIPES_SLUG}`,
    }
  }

  return {
    showPrice: true,
    badge: "price",
    primaryLabel: "Buy ebook",
    href: `/shop/${CLEAN_LIVING_RECIPES_SLUG}`,
  }
}

export function resolveShopCatalogCta(input: {
  productType: string
  isAuthenticated: boolean
  isPurchased: boolean
  productSlug: string
}): ShopEbookCta {
  if (input.productType === "ebook") {
    const cta = resolveShopEbookCta({
      isAuthenticated: input.isAuthenticated,
      isPurchased: input.isPurchased,
    })
    return {
      ...cta,
      href: input.isPurchased ? EBOOK_DOWNLOADS_PATH : `/shop/${input.productSlug}`,
    }
  }

  if (input.isPurchased) {
    return {
      showPrice: false,
      badge: "purchased",
      primaryLabel: "Download",
      href: EBOOK_DOWNLOADS_PATH,
    }
  }

  return {
    showPrice: true,
    badge: "price",
    primaryLabel: input.isAuthenticated ? "Buy now" : "Get it",
    href: `/shop/${input.productSlug}`,
  }
}

/**
 * Ensure customer-facing UI never receives raw storage object paths.
 */
export function sanitizePublicFileFields(input: {
  fileName: string
  storageBucket?: string | null
  storagePath?: string | null
}): { fileName: string } {
  void input.storageBucket
  void input.storagePath
  return { fileName: input.fileName }
}

export function isShortLivedDownloadTtl(expiresInSeconds: number): boolean {
  return expiresInSeconds > 0 && expiresInSeconds <= PRODUCT_DOWNLOAD_URL_EXPIRES_SECONDS
}

/**
 * Cache-Control guidance for signed download responses: private, no shared cache.
 */
export function downloadResponseCacheControl(): string {
  return "private, no-store"
}
