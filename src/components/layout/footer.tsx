import Link from "next/link"

import { Container } from "@/components/layout/container"
import { Logo } from "@/components/layout/logo"
import {
  PUBLIC_FOOTER_DESCRIPTION,
  PUBLIC_LEGAL_DISCLAIMER,
  PUBLIC_LOGO,
  PUBLIC_NAV_LINKS,
  PUBLIC_SOCIAL_LINKS,
} from "@/lib/constants/public-site"

type FooterProps = {
  isAuthenticated: boolean
}

function Footer({ isAuthenticated }: FooterProps) {
  return (
    <footer className="bg-ink px-(--spacing-wrap-x) py-[46px] pb-7 text-[#C2D2D0]">
      <Container>
        <div className="flex flex-wrap justify-between gap-6">
          <div>
            <Logo accent={PUBLIC_LOGO.accent} suffix={PUBLIC_LOGO.suffix} variant="footer" />
            <p className="mt-2.5 max-w-[280px] text-sm">{PUBLIC_FOOTER_DESCRIPTION}</p>
            <div className="mt-3.5 flex flex-wrap gap-3">
              {PUBLIC_SOCIAL_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-[13px] font-semibold text-[#C2D2D0] transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              ))}
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

        <div className="mt-[30px] border-t border-[rgba(255,255,255,0.12)] pt-[18px] text-[12.5px] text-[#8FA3A1]">
          {PUBLIC_LEGAL_DISCLAIMER}
        </div>
      </Container>
    </footer>
  )
}

export { Footer, type FooterProps }
