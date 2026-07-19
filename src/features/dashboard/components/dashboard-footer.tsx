import Link from "next/link"

import { BrandLogo } from "@/components/layout/brand-logo"
import { Container } from "@/components/layout/container"
import { DASHBOARD_FOOTER_LINKS } from "@/features/dashboard/constants/navigation"
import { PUBLIC_LEGAL_DISCLAIMER } from "@/lib/constants/public-site"

function DashboardFooter() {
  return (
    <footer className="mt-auto bg-ink px-(--spacing-wrap-x) py-[46px] pb-7 text-[#C2D2D0]">
      <Container>
        <div className="flex flex-wrap justify-between gap-6">
          <div>
            <BrandLogo variant="horizontal" size="md" appearance="footer" href="/" />
            <p className="mt-2.5 max-w-[320px] text-sm">
              Evidence-informed functional medicine and breathwork for members. This is not medical advice.
            </p>
          </div>

          <nav
            aria-label="Dashboard footer"
            className="flex flex-wrap gap-[22px] self-start"
          >
            {DASHBOARD_FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-[#C2D2D0] transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-[30px] border-t border-[rgba(255,255,255,0.12)] pt-[18px] text-[12.5px] text-[#8FA3A1]">
          {PUBLIC_LEGAL_DISCLAIMER}
        </div>
      </Container>
    </footer>
  )
}

export { DashboardFooter }
