import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"

import { BackButton, Container, Section } from "@/components/layout"
import { CheckoutConsentForm } from "@/features/checkout/components"
import { resolveCheckoutConsentContext } from "@/features/checkout/services/checkout.service"
import { resolveExistingCourseGrantDestination } from "@/features/checkout/services/reset-plan-offer.service"
import type { CheckoutConsentType } from "@/features/checkout/utils/checkout-urls"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import type { BillingInterval } from "@/features/plans/types"

export const metadata: Metadata = {
  title: "Checkout",
  description: "Confirm your details before secure Stripe checkout.",
}

type ConsentPageProps = {
  searchParams: Promise<{
    type?: CheckoutConsentType
    planSlug?: string
    slug?: string
    interval?: BillingInterval
  }>
}

export default async function CheckoutConsentPage({ searchParams }: ConsentPageProps) {
  const profileResult = await getCurrentProfile()
  const params = await searchParams

  if (params.type !== "membership" && params.type !== "product") {
    notFound()
  }

  const contextResult = await resolveCheckoutConsentContext({
    type: params.type,
    planSlug: params.planSlug,
    productSlug: params.slug,
    interval: params.interval,
    userId: profileResult.success ? profileResult.data.id : null,
  })

  if (!contextResult.success) {
    notFound()
  }

  const context = contextResult.data

  if (
    profileResult.success &&
    context.type === "product" &&
    context.productId
  ) {
    const entitledResult = await resolveExistingCourseGrantDestination({
      userId: profileResult.data.id,
      productId: context.productId,
    })

    if (entitledResult.success && entitledResult.data) {
      redirect(entitledResult.data)
    }
  }

  return (
    <main>
      <Section padding="default">
        <Container className="max-w-2xl">
          <div className="mb-4">
            <BackButton fallbackHref={context.returnTo} label="← Back" />
          </div>

          <div className="mb-6 text-center">
            <p className="text-xs font-bold tracking-[0.12em] text-green-deep uppercase">
              Step 1 of 2
            </p>
            <h1 className="mt-2 font-display text-3xl font-medium text-ink">
              Where should we send your access?
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              Confirm your details, then continue to secure Stripe checkout.
            </p>
          </div>

          <Suspense fallback={<p className="text-sm text-ink-soft">Loading checkout...</p>}>
            <CheckoutConsentForm
              context={context}
              defaultFullName={profileResult.success ? profileResult.data.fullName : null}
              defaultEmail={profileResult.success ? profileResult.data.email : null}
              isAuthenticated={profileResult.success}
            />
          </Suspense>
        </Container>
      </Section>
    </main>
  )
}
