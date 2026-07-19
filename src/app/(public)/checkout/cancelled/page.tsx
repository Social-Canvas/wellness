import type { Metadata } from "next"
import Link from "next/link"

import { BackButton, Container, Section } from "@/components/layout"
import { buttonVariants } from "@/components/ui/button"
import type { CheckoutConsentType } from "@/features/checkout/utils/checkout-urls"
import { sanitizeReturnPath } from "@/features/checkout/utils/safe-return-path"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Checkout cancelled",
  description: "Your checkout was cancelled. No payment was taken.",
}

type CancelledPageProps = {
  searchParams: Promise<{
    type?: CheckoutConsentType
  }>
}

function resolveCancelledTargets(type: CheckoutConsentType | undefined) {
  if (type === "membership") {
    return {
      primaryHref: sanitizeReturnPath("/programs", "/programs"),
      primaryLabel: "Return to programs",
      secondaryHref: "/shop",
      secondaryLabel: "Browse shop",
    }
  }

  if (type === "product") {
    return {
      primaryHref: "/shop",
      primaryLabel: "Return to shop",
      secondaryHref: "/programs",
      secondaryLabel: "View programs",
    }
  }

  return {
    primaryHref: "/shop",
    primaryLabel: "Return to shop",
    secondaryHref: "/programs",
    secondaryLabel: "View programs",
  }
}

export default async function CheckoutCancelledPage({ searchParams }: CancelledPageProps) {
  const params = await searchParams
  const targets = resolveCancelledTargets(params.type)

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
          <h1 className="mt-4 font-display text-3xl font-medium text-ink">
            Checkout cancelled
          </h1>
          <p className="mx-auto mt-2 max-w-md text-base text-ink-soft">
            Payment was not completed. No charge was made. You can return to the product or shop
            whenever you are ready.
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
