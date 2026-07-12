import Link from "next/link"

import { Navbar } from "@/components/layout/navbar"
import { NavbarLinks } from "@/components/layout/navbar-links"
import { NavbarSignOutButton } from "@/components/layout/navbar-sign-out-button"
import { buttonVariants } from "@/components/ui/button"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { PUBLIC_LOGO, PUBLIC_NAV_LINKS } from "@/lib/constants/public-site"
import { cn } from "@/lib/utils"

async function PublicNavbar() {
  const profileResult = await getCurrentProfile()
  const isAuthenticated = profileResult.success

  return (
    <Navbar
      logo={{
        accent: PUBLIC_LOGO.accent,
        suffix: PUBLIC_LOGO.suffix,
        src: PUBLIC_LOGO.src,
        alt: PUBLIC_LOGO.alt,
        href: "/",
      }}
      links={[]}
      actions={[]}
      navMiddle={<NavbarLinks links={PUBLIC_NAV_LINKS} />}
      navActions={
        isAuthenticated ? (
          <>
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Dashboard
            </Link>
            <NavbarSignOutButton />
          </>
        ) : (
          <>
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
          </>
        )
      }
    />
  )
}

export { PublicNavbar }
