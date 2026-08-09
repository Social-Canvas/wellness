import type { SVGProps } from "react"

type SocialIconProps = SVGProps<SVGSVGElement>

function socialIconProps({ className, ...props }: SocialIconProps) {
  return {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    focusable: false as const,
    className: className ?? "size-5 shrink-0",
    ...props,
  }
}

/** Lucide does not ship trademarked brand icons; keep lightweight inline SVGs. */
function InstagramIcon(props: SocialIconProps) {
  return (
    <svg {...socialIconProps(props)}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

function FacebookIcon(props: SocialIconProps) {
  return (
    <svg {...socialIconProps(props)}>
      <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1Z" />
    </svg>
  )
}

/** Group/community mark — three overlapping people silhouettes, distinct from the Facebook page icon. */
function FacebookCommunityIcon(props: SocialIconProps) {
  return (
    <svg {...socialIconProps(props)}>
      {/* Back-left person */}
      <circle cx="6.5" cy="8" r="2.15" />
      <path d="M3.2 17.8c.2-2.2 1.5-3.4 3.3-3.4s3.1 1.2 3.3 3.4" />
      {/* Back-right person */}
      <circle cx="17.5" cy="8" r="2.15" />
      <path d="M14.2 17.8c.2-2.2 1.5-3.4 3.3-3.4s3.1 1.2 3.3 3.4" />
      {/* Front-center person */}
      <circle cx="12" cy="9" r="2.55" />
      <path d="M7.4 19c.3-2.6 2-4.1 4.6-4.1s4.3 1.5 4.6 4.1" />
    </svg>
  )
}

function LinkedInIcon(props: SocialIconProps) {
  return (
    <svg {...socialIconProps(props)}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M8 10v7M8 7.5v.01M12 17v-4.5a2 2 0 0 1 4 0V17" />
    </svg>
  )
}

export {
  FacebookCommunityIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  type SocialIconProps,
}
