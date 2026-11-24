import Link from "next/link"

import { BrandLogo } from "@/components/layout/brand-logo"
import { Container } from "@/components/layout/container"
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
} from "@/components/layout/social-icons"
import {
  PUBLIC_FOOTER_DESCRIPTION,
  PUBLIC_LEGAL_DISCLAIMER,
  PUBLIC_NAV_LINKS,
} from "@/lib/constants/public-site"
import {
  PUBLIC_FACEBOOK_GROUP_LINK,
  PUBLIC_FACEBOOK_GROUP_LINK_CLASSNAME,
  PUBLIC_SOCIAL_LINK_CLASSNAME,
  PUBLIC_SOCIAL_PROFILE_LINKS,
} from "@/lib/constants/social-links"
import { readSiteText } from "@/features/site-content/resolve"
import { loadSiteContent } from "@/features/site-content/services/site-content.service"

type FooterProps = {
  isAuthenticated: boolean
}

const PROFILE_ICONS = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  linkedin: LinkedInIcon,
} as const

async function Footer({ isAuthenticated }: FooterProps) {
  const content = await loadSiteContent()
  const groupHref = readSiteText(
    content,
    "global.social.facebook_group",
    PUBLIC_FACEBOOK_GROUP_LINK.href
  )
  const groupLabel = readSiteText(
    content,
    "global.social.facebook_group_label",
    PUBLIC_FACEBOOK_GROUP_LINK.label
  )

  return (
    <footer className="bg-ink px-(--spacing-wrap-x) py-[46px] pb-7 text-[#C2D2D0]">
      <Container>
        <div className="flex flex-wrap justify-between gap-6">
          <div className="min-w-0 max-w-full">
            <BrandLogo variant="horizontal" size="lg" appearance="footer" href="/" />
            <p className="mt-2.5 max-w-[280px] text-sm">
              {readSiteText(content, "global.footer.description", PUBLIC_FOOTER_DESCRIPTION)}
            </p>

            <div className="mt-3.5 max-w-full">
              <nav
                aria-label="Social media"
                className="flex w-fit max-w-full flex-nowrap items-center gap-3"
              >
                {PUBLIC_SOCIAL_PROFILE_LINKS.map((link) => {
                  const Icon = PROFILE_ICONS[link.network]
                  const href = readSiteText(
                    content,
                    link.network === "instagram"
                      ? "global.social.instagram"
                      : link.network === "facebook"
                        ? "global.social.facebook"
                        : "global.social.linkedin",
                    link.href
                  )
                  return (
                    <a
                      key={link.network}
                      href={href}
                      target={link.target}
                      rel={link.rel}
                      aria-label={link.ariaLabel}
                      className={PUBLIC_SOCIAL_LINK_CLASSNAME}
                    >
                      <Icon />
                    </a>
                  )
                })}
              </nav>

              <div className="mt-4 max-w-[280px]">
                <a
                  href={groupHref}
                  target={PUBLIC_FACEBOOK_GROUP_LINK.target}
                  rel={PUBLIC_FACEBOOK_GROUP_LINK.rel}
                  aria-label={PUBLIC_FACEBOOK_GROUP_LINK.ariaLabel}
                  className={PUBLIC_FACEBOOK_GROUP_LINK_CLASSNAME}
                >
                  <FacebookIcon className="size-3.5 shrink-0 opacity-90" />
                  <span>{groupLabel}</span>
                  <span aria-hidden="true" className="font-normal">
                    →
                  </span>
                </a>
                <p className="mt-1 text-xs leading-snug text-[#8FA3A1]">
                  {PUBLIC_FACEBOOK_GROUP_LINK.description}
                </p>
              </div>
            </div>
          </div>

          <nav
            aria-label="Footer"
            className="flex flex-wrap gap-[22px] self-start"
          >
            {PUBLIC_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-[#C2D2D0] transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={isAuthenticated ? "/dashboard" : "/login"}
              className="text-sm font-semibold text-[#C2D2D0] transition-colors hover:text-white"
            >
              {isAuthenticated ? "Dashboard" : "Log in"}
            </Link>
          </nav>
        </div>

        <div className="mt-[30px] flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(255,255,255,0.12)] pt-[18px] text-[12.5px] text-[#8FA3A1]">
          <p>{PUBLIC_LEGAL_DISCLAIMER}</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-4">
            <Link
              href="/privacy"
              className="font-semibold text-[#C2D2D0] transition-colors hover:text-white"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="font-semibold text-[#C2D2D0] transition-colors hover:text-white"
            >
              Terms
            </Link>
            <Link
              href="/refund"
              className="font-semibold text-[#C2D2D0] transition-colors hover:text-white"
            >
              Refunds
            </Link>
          </nav>
        </div>
      </Container>
    </footer>
  )
}

export { Footer, type FooterProps }
