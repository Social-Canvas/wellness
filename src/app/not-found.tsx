import type { Metadata } from "next"
import Link from "next/link"

import { Container, Footer, Logo } from "@/components/layout"
import { PublicNavbar } from "@/components/layout/public-navbar"
import { BrandImage } from "@/components/media"
import { buttonVariants } from "@/components/ui/button"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"
import { BRAND_IMAGES } from "@/lib/brand/images"
import { PUBLIC_LEGAL_DISCLAIMER, PUBLIC_LOGO } from "@/lib/constants/public-site"
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
      <main className="flex flex-1 bg-cream py-16">
        <Container className="max-w-5xl">
          <div className="grid items-center gap-10 min-[861px]:grid-cols-[1fr_0.85fr]">
            <div className="text-center min-[861px]:text-left">
              <Logo
                accent={PUBLIC_LOGO.accent}
                suffix={PUBLIC_LOGO.suffix}
                className="justify-center text-3xl min-[861px]:justify-start"
              />
              <p className="mt-8 text-xs font-bold tracking-[0.18em] text-blue uppercase">
                404
              </p>
              <h1 className="mt-3 font-display text-4xl font-medium text-ink">
                Page not found
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-ink-soft min-[861px]:mx-0">
                This page may have moved or no longer exists. Return to {ELEVATE_BRAND.name}{" "}
                to continue your journey.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row min-[861px]:justify-start">
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

              <p className="mx-auto mt-10 max-w-lg text-sm text-ink-soft min-[861px]:mx-0">
                {PUBLIC_LEGAL_DISCLAIMER}
              </p>
            </div>

            <BrandImage
              image={BRAND_IMAGES.meditationHands}
              containerClassName="aspect-[4/5] w-full overflow-hidden rounded-2xl border border-line shadow-sm"
              sizes="(max-width: 860px) 100vw, 40vw"
            />
          </div>
        </Container>
      </main>
      <Footer isAuthenticated={isAuthenticated} />
    </>
  )
}
