import Link from "next/link"

import { Navbar } from "@/components/layout/navbar"
import { NavbarLinks } from "@/components/layout/navbar-links"
import { NavbarSignOutButton } from "@/components/layout/navbar-sign-out-button"
import { PublicMobileNav } from "@/components/layout/public-mobile-nav"
import { buttonVariants } from "@/components/ui/button"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { readSiteText } from "@/features/site-content/resolve"
import { loadSiteContent } from "@/features/site-content/services/site-content.service"
import { PUBLIC_NAV_LINKS } from "@/lib/constants/public-site"
import { cn } from "@/lib/utils"

async function PublicNavbar() {
  const [profileResult, content] = await Promise.all([
    getCurrentProfile(),
    loadSiteContent(),
  ])
  const isAuthenticated = profileResult.success
  const primaryCta = {
    label: readSiteText(content, "global.nav.cta_label", "Start Reset Plan"),
    href: readSiteText(content, "global.nav.cta_href", "/programs#reset-plan"),
  }

  return (
    <Navbar
      logo={{
        href: "/",
        hideWordmarkBelow: "sm",
      }}
      links={[]}
      actions={[]}
      navMiddle={<NavbarLinks links={PUBLIC_NAV_LINKS} />}
      navActions={
        <>
          <PublicMobileNav
            links={PUBLIC_NAV_LINKS}
            isAuthenticated={isAuthenticated}
            primaryCta={primaryCta}
          />
          {isAuthenticated ? (
            <div className="hidden items-center gap-2.5 lg:flex">
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Dashboard
              </Link>
              <NavbarSignOutButton />
            </div>
          ) : (
            <div className="hidden items-center gap-2.5 lg:flex">
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Log in
              </Link>
              <Link
                href={primaryCta.href}
                className={cn(buttonVariants({ variant: "default", size: "sm" }))}
              >
                {primaryCta.label}
              </Link>
            </div>
          )}
        </>
      }
    />
  )
}

export { PublicNavbar }
