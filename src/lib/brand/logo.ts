/** Square cut mark — text-free icon for compact/header icon variants. */
export const BRAND_LOGO_MARK = {
  src: "/brand/elevate-mark-square.png",
  width: 147,
  height: 159,
} as const

/** Horizontal lockup with dark text — for light backgrounds (navbar, light headers). */
export const BRAND_LOGO_LOCKUP_DARK_TEXT = {
  src: "/brand/elevate-lockup-dark-text.png",
  width: 398,
  height: 174,
} as const

/** Horizontal lockup with white text — for dark backgrounds (footer, inverse). */
export const BRAND_LOGO_LOCKUP_WHITE_TEXT = {
  src: "/brand/elevate-lockup-white-text.png",
  width: 398,
  height: 174,
} as const

/** Keep in sync with `ELEVATE_BRAND.name`. */
export const BRAND_LOGO_NAME = "Elevate Health Solutions" as const

/** Display heights (px) for the square mark by size token. */
export const BRAND_LOGO_MARK_HEIGHTS = {
  sm: 40,
  md: 48,
  lg: 56,
} as const

/** Display heights (px) for the horizontal lockup by size token. */
export const BRAND_LOGO_LOCKUP_HEIGHTS = {
  sm: 40,
  md: 52,
  lg: 60,
} as const

export type BrandLogoVariant = "icon" | "horizontal"

export type BrandLogoLockupTone = "dark-text" | "white-text"

export type BrandLogoSizeToken = keyof typeof BRAND_LOGO_MARK_HEIGHTS

export const BRAND_LOGO_HOME_LABEL = `${BRAND_LOGO_NAME} home`

/**
 * Image alt for the rendered asset.
 * Icon and horizontal lockups both carry the brand identity in the image.
 */
export function getBrandLogoImageAlt(variant: BrandLogoVariant): string {
  switch (variant) {
    case "icon":
    case "horizontal":
      return BRAND_LOGO_NAME
  }
}

export function getBrandLogoLockup(tone: BrandLogoLockupTone = "dark-text") {
  return tone === "white-text"
    ? BRAND_LOGO_LOCKUP_WHITE_TEXT
    : BRAND_LOGO_LOCKUP_DARK_TEXT
}

export function getBrandLogoAbsoluteMarkUrl(appUrl: string): string {
  const base = appUrl.replace(/\/$/, "")
  return `${base}${BRAND_LOGO_MARK.src}`
}
