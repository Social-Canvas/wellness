import Link from "next/link"

import { Navbar } from "@/components/layout/navbar"
import { NavbarLinks } from "@/components/layout/navbar-links"
import { NavbarSignOutButton } from "@/components/layout/navbar-sign-out-button"
import { PublicMobileNav } from "@/components/layout/public-mobile-nav"
import { buttonVariants } from "@/components/ui/button"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { PUBLIC_NAV_LINKS } from "@/lib/constants/public-site"
import { cn } from "@/lib/utils"

async function PublicNavbar() {
  const profileResult = await getCurrentProfile()
  const isAuthenticated = profileResult.success

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
                href="/programs#reset-plan"
                className={cn(buttonVariants({ variant: "default", size: "sm" }))}
              >
                Start Reset Plan
              </Link>
            </div>
          )}
        </>
      }
    />
  )
}

export { PublicNavbar }
