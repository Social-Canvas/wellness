/**
 * Public catalog visibility for one-time programs/sessions.
 *
 * Commerce source of truth remains `products.status` (`draft` | `published` |
 * `archived`). This module mirrors that intent for static marketing offers and
 * live Stripe activation inventory without deleting catalog rows.
 */

export const HEALTH_PROFESSIONAL_SESSION_SLUG =
  "health-professional-session" as const

/** Slugs withheld from public marketing and live Stripe Checkout activation. */
export const PUBLICLY_HIDDEN_CATALOG_SLUGS = [
  HEALTH_PROFESSIONAL_SESSION_SLUG,
] as const

export type PubliclyHiddenCatalogSlug =
  (typeof PUBLICLY_HIDDEN_CATALOG_SLUGS)[number]

export function isPubliclyHiddenCatalogSlug(slug: string): boolean {
  return (PUBLICLY_HIDDEN_CATALOG_SLUGS as readonly string[]).includes(slug)
}

export type ProgramOfferVisibility = {
  slug: string
  title: string
  publiclyVisible?: boolean
}

/** Public Programs cards — excludes unpublished / publicly hidden offers. */
export function getPublicProgramOffers<T extends ProgramOfferVisibility>(
  offers: readonly T[]
): T[] {
  return offers.filter(
    (offer) =>
      offer.publiclyVisible !== false && !isPubliclyHiddenCatalogSlug(offer.slug)
  )
}

/**
 * Whether a product row may appear in anonymous/public catalog surfaces.
 * Draft and archived rows are never public; hidden slugs are never public even
 * if accidentally left published.
 */
export function isPublicCatalogProduct(product: {
  slug: string
  status: string
}): boolean {
  if (product.status !== "published") {
    return false
  }

  return !isPubliclyHiddenCatalogSlug(product.slug)
}

/**
 * Direct *public* detail/checkout access. Hidden/draft rows always deny on
 * public routes. `?preview=1` never authorizes; admins use admin surfaces.
 */
export function isUnauthorizedPublicCatalogAccess(input: {
  slug: string
  productStatus: string | null | undefined
  previewRequested?: boolean
}): boolean {
  // Query-param preview alone must never unlock a hidden/draft catalog row.
  void input.previewRequested

  return !isPublicCatalogProduct({
    slug: input.slug,
    status: input.productStatus ?? "draft",
  })
}

/** Admin/authorized surfaces may still load the preserved draft record. */
export function canAdminPreviewHiddenCatalog(input: {
  slug: string
  role: string | null | undefined
}): boolean {
  if (!isPubliclyHiddenCatalogSlug(input.slug)) {
    return true
  }

  return input.role === "admin" || input.role === "super_admin"
}
