/** Primary square brand mark — do not stretch or replace with a wide-logo image. */
export const BRAND_LOGO_MARK = {
  src: "/brand/elevate-logo-mark.png",
  width: 228,
  height: 208,
} as const

/** Keep in sync with `ELEVATE_BRAND.name`. */
export const BRAND_LOGO_NAME = "Elevate Health Solutions" as const

export type BrandLogoVariant = "icon" | "horizontal"

export const BRAND_LOGO_HOME_LABEL = `${BRAND_LOGO_NAME} home`

/**
 * Image alt for the mark.
 * Horizontal lockups expose the brand name via adjacent text — mark stays decorative.
 */
export function getBrandLogoImageAlt(variant: BrandLogoVariant): string {
  return variant === "icon" ? BRAND_LOGO_NAME : ""
}

export function getBrandLogoAbsoluteMarkUrl(appUrl: string): string {
  const base = appUrl.replace(/\/$/, "")
  return `${base}${BRAND_LOGO_MARK.src}`
}
