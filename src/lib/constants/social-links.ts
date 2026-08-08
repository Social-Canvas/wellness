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
  ariaLabel: "Join our Facebook community",
  target: "_blank" as const,
  rel: SOCIAL_EXTERNAL_LINK_REL,
} as const

/** Shared class for keyboard-visible, mobile-friendly social anchors. */
export const PUBLIC_SOCIAL_LINK_CLASSNAME =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-[#C2D2D0] transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
