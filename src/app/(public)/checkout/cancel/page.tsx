import type { Metadata } from "next"
import Link from "next/link"

import { BackButton, Container, Section } from "@/components/layout"
import { buttonVariants } from "@/components/ui/button"
import type { CheckoutConsentType } from "@/features/checkout/utils/checkout-urls"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Checkout canceled",
  description: "Your checkout was canceled.",
}

type CancelPageProps = {
  searchParams: Promise<{
    type?: CheckoutConsentType
    returnTo?: string
  }>
}

function resolveCancelTargets(type: CheckoutConsentType | undefined, returnTo?: string) {
  const safeReturnTo =
    returnTo && returnTo.startsWith("/") ? decodeURIComponent(returnTo) : null

  if (safeReturnTo) {
    return {
      primaryHref: safeReturnTo,
      primaryLabel: type === "membership" ? "Back to programs" : "Try again",
      secondaryHref: type === "membership" ? "/programs" : "/shop",
      secondaryLabel: type === "membership" ? "View membership plans" : "Browse shop",
    }
  }

  if (type === "membership") {
    return {
      primaryHref: "/programs",
      primaryLabel: "Back to programs",
      secondaryHref: "/shop",
      secondaryLabel: "Browse shop",
    }
  }

  return {
    primaryHref: "/shop",
    primaryLabel: "Back to shop",
    secondaryHref: "/programs",
    secondaryLabel: "View programs",
  }
}

export default async function CheckoutCancelPage({ searchParams }: CancelPageProps) {
  const params = await searchParams
  const targets = resolveCancelTargets(params.type, params.returnTo)

  return (
    <main>
      <Section padding="default">
        <Container className="max-w-xl text-center">
          <div className="mb-4 text-left">
            <BackButton fallbackHref={targets.primaryHref} label="← Back" />
          </div>

          <div
            aria-hidden
            className="mx-auto flex size-16 items-center justify-center rounded-full bg-cream text-3xl text-ink-soft"
          >
            ×
          </div>
          <h1 className="mt-4 font-display text-3xl font-medium text-ink">Checkout canceled</h1>
          <p className="mx-auto mt-2 max-w-md text-base text-ink-soft">
            No payment was taken. You can return when you are ready to continue.
          </p>

          <div className="mx-auto mt-6 flex max-w-md flex-col gap-3">
            <Link
              href={targets.primaryHref}
              className={cn(buttonVariants({ variant: "default", size: "block" }))}
            >
              {targets.primaryLabel}
            </Link>
            <Link
              href={targets.secondaryHref}
              className={cn(buttonVariants({ variant: "outline", size: "block" }))}
            >
              {targets.secondaryLabel}
            </Link>
          </div>
        </Container>
      </Section>
    </main>
  )
}
