import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"

export const PUBLIC_TICKER_MESSAGE =
  "Educational content only · not medical advice · Start with the Reset Plan or explore Elevate memberships"

export const PUBLIC_NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Programs", href: "/programs" },
  { label: "Shop", href: "/shop" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
] as const

export const PUBLIC_SOCIAL_LINKS = [
  { label: "Instagram", href: "https://instagram.com" },
  { label: "LinkedIn", href: "https://linkedin.com" },
  { label: "Facebook", href: "https://facebook.com" },
  { label: "Podcast", href: "/podcast" },
] as const

export const PUBLIC_FOOTER_DESCRIPTION =
  "Functional medicine, breathwork, and nervous system regulation — science + soul."

export const PUBLIC_LEGAL_DISCLAIMER = `© 2026 ${ELEVATE_BRAND.name}. Educational content only — not medical advice.`

export const PUBLIC_LOGO = {
  markSrc: "/brand/elevate-logo-mark.png",
  src: "/brand/elevate-logo-horizontal.png",
  alt: "Elevate Health Solutions",
  accent: "Elevate",
  suffix: "Health Solutions",
} as const
