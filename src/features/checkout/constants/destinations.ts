/**
 * Server-controlled post-purchase destinations.
 * Never accept arbitrary redirect/courseId from the browser.
 */

/** Canonical Reset course id used by the library player route. */
export const RESET_COURSE_ID = "5d5d648a-9038-4cff-b37d-7f5e10f34982"

export const RESET_PRODUCT_SLUG = "7-day-reset"

export const RESET_LIBRARY_PATH = `/dashboard/library/${RESET_COURSE_ID}` as const

export const MEMBERSHIP_LIBRARY_PATH = "/dashboard/library" as const

export const EBOOK_LIBRARY_PATH = "/dashboard/library" as const

export type PostPurchaseDestination = {
  href: string
  label: string
  autoRedirect: boolean
}

export type ResolvePostPurchaseDestinationInput = {
  purchaseType: "membership" | "product"
  productSlug?: string | null
  productType?: string | null
  grantedCourseId?: string | null
}

export function isResetPurchase(input: {
  productSlug?: string | null
  grantedCourseId?: string | null
}): boolean {
  if (input.productSlug === RESET_PRODUCT_SLUG) {
    return true
  }

  if (input.grantedCourseId === RESET_COURSE_ID) {
    return true
  }

  return false
}

/**
 * Map an internal product/plan purchase to a trusted in-app destination.
 * Open redirects are impossible: href is always a fixed allowlisted path.
 */
export function resolvePostPurchaseDestination(
  input: ResolvePostPurchaseDestinationInput
): PostPurchaseDestination {
  if (input.purchaseType === "membership") {
    return {
      href: MEMBERSHIP_LIBRARY_PATH,
      label: "Go to My Library",
      autoRedirect: false,
    }
  }

  if (isResetPurchase(input)) {
    return {
      href: RESET_LIBRARY_PATH,
      label: "Open the 7-Day Elevated Reset",
      autoRedirect: true,
    }
  }

  if (input.productType === "ebook") {
    return {
      href: EBOOK_LIBRARY_PATH,
      label: "Go to My Library",
      autoRedirect: false,
    }
  }

  return {
    href: MEMBERSHIP_LIBRARY_PATH,
    label: "Go to My Library",
    autoRedirect: false,
  }
}
