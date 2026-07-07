import type { Metadata } from "next"
import Link from "next/link"

import { Container, Footer, Logo } from "@/components/layout"
import { PublicNavbar } from "@/components/layout/public-navbar"
import { buttonVariants } from "@/components/ui/button"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { PUBLIC_LEGAL_DISCLAIMER } from "@/lib/constants/public-site"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you are looking for could not be found.",
}

export default async function NotFoundPage() {
  const profileResult = await getCurrentProfile()
  const isAuthenticated = profileResult.success

  return (
    <>
      <PublicNavbar />
      <main className="flex flex-1 items-center bg-cream py-16">
        <Container className="max-w-2xl text-center">
          <Logo accent="Wellness" suffix="Studio" className="justify-center text-3xl" />
          <p className="mt-8 text-xs font-bold tracking-[0.18em] text-blue uppercase">
            404
          </p>
          <h1 className="mt-3 font-display text-4xl font-medium text-ink">
            Page not found
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-ink-soft">
            The page you are looking for may have moved, been removed, or never existed.
            Use the links below to get back on track.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "default", size: "default" }))}
            >
              Go home
            </Link>
            <Link
              href="/programs"
              className={cn(buttonVariants({ variant: "outline", size: "default" }))}
            >
              Browse programs
            </Link>
            <Link
              href={isAuthenticated ? "/dashboard" : "/login"}
              className={cn(buttonVariants({ variant: "outline", size: "default" }))}
            >
              {isAuthenticated ? "Dashboard" : "Log in"}
            </Link>
          </div>

          <p className="mx-auto mt-10 max-w-lg text-sm text-ink-soft">
            {PUBLIC_LEGAL_DISCLAIMER}
          </p>
        </Container>
      </main>
      <Footer isAuthenticated={isAuthenticated} />
    </>
  )
}
