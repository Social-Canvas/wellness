/**
 * Canonical Elevate / Dr. Deepa social destinations.
 * Import from here — do not duplicate raw URLs in components.
 */
export const ELEVATE_SOCIAL_URLS = {
  instagram: "https://www.instagram.com/elevatewithdrdeepa",
  facebook: "https://www.facebook.com/deepa.pattani",
  linkedin:
    "https://www.linkedin.com/in/dr-deepa-pattani-certified-functional-med-specialist-06426988/",
  facebookGroup: "https://www.facebook.com/groups/preautoimmune",
} as const

export type ElevateSocialNetwork = keyof typeof ELEVATE_SOCIAL_URLS

export const SOCIAL_EXTERNAL_LINK_REL = "noopener noreferrer" as const

export type PublicSocialProfileLink = {
  network: "instagram" | "facebook" | "linkedin"
  href: string
  ariaLabel: string
  target: "_blank"
  rel: typeof SOCIAL_EXTERNAL_LINK_REL
}

/** Profile / page icons for the public footer (not the Facebook Group). */
export const PUBLIC_SOCIAL_PROFILE_LINKS: readonly PublicSocialProfileLink[] = [
  {
    network: "instagram",
    href: ELEVATE_SOCIAL_URLS.instagram,
    ariaLabel: "Follow Elevate on Instagram",
    target: "_blank",
    rel: SOCIAL_EXTERNAL_LINK_REL,
  },
  {
    network: "facebook",
    href: ELEVATE_SOCIAL_URLS.facebook,
    ariaLabel: "Follow Dr. Deepa Pattani on Facebook",
    target: "_blank",
    rel: SOCIAL_EXTERNAL_LINK_REL,
  },
  {
    network: "linkedin",
    href: ELEVATE_SOCIAL_URLS.linkedin,
    ariaLabel: "Connect with Dr. Deepa Pattani on LinkedIn",
    target: "_blank",
    rel: SOCIAL_EXTERNAL_LINK_REL,
  },
] as const

export const PUBLIC_FACEBOOK_GROUP_LINK = {
  href: ELEVATE_SOCIAL_URLS.facebookGroup,
  label: "Join our Facebook community",
  description: "Healing Auto-immune and Pre Auto-Immune Naturally",
  ariaLabel:
    "Join Healing Auto-immune and Pre Auto-Immune Naturally on Facebook",
  target: "_blank" as const,
  rel: SOCIAL_EXTERNAL_LINK_REL,
} as const

/**
 * Compact circular profile icon buttons (42–46px hit area, 20–22px glyph).
 * Secondary footer hierarchy — muted by default, brighter on hover.
 */
export const PUBLIC_SOCIAL_LINK_CLASSNAME =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[#C2D2D0] transition-[color,background-color,border-color,transform] duration-200 ease-out hover:-translate-y-px hover:border-white/30 hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none motion-reduce:hover:translate-y-0"

/** Text-style Facebook community CTA — not a fourth social icon button. */
export const PUBLIC_FACEBOOK_GROUP_LINK_CLASSNAME =
  "inline-flex max-w-full items-center gap-1.5 rounded-md text-sm font-semibold text-[#C2D2D0] transition-colors duration-200 ease-out hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
