import Link from "next/link"

import { Navbar } from "@/components/layout/navbar"
import { NavbarLinks } from "@/components/layout/navbar-links"
import { NavbarSignOutButton } from "@/components/layout/navbar-sign-out-button"
import { buttonVariants } from "@/components/ui/button"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import {
  PUBLIC_NAV_LINKS,
  PUBLIC_SOCIAL_LINKS,
} from "@/lib/constants/public-site"
import { cn } from "@/lib/utils"

async function PublicNavbar() {
  const profileResult = await getCurrentProfile()
  const isAuthenticated = profileResult.success

  return (
    <Navbar
      logo={{ accent: "Wellness", suffix: "Studio", href: "/" }}
      links={[]}
      socialLinks={[...PUBLIC_SOCIAL_LINKS]}
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
              href="/programs"
              className={cn(buttonVariants({ variant: "default", size: "sm" }))}
            >
              Get started
            </Link>
          </>
        )
      }
    />
  )
}

export { PublicNavbar }
