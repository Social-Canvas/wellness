import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { Container, Section } from "@/components/layout"
import { CheckoutSuccessStatus } from "@/features/checkout/components/checkout-success-status"
import { resolveCheckoutSuccessView } from "@/features/checkout/services/checkout-success.service"
import { getCurrentProfile } from "@/features/auth/services/auth.service"

export const metadata: Metadata = {
  title: "Payment successful",
  description: "Your checkout was completed successfully.",
}

type SuccessPageProps = {
  searchParams: Promise<{
    session_id?: string
  }>
}

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    const params = await searchParams
    const sessionId = params.session_id ?? ""
    const returnTo = sessionId
      ? `/checkout/success?session_id=${encodeURIComponent(sessionId)}`
      : "/checkout/success"
    redirect(`/login?redirectTo=${encodeURIComponent(returnTo)}`)
  }

  const params = await searchParams
  const viewResult = await resolveCheckoutSuccessView(
    profileResult.data.id,
    params.session_id
  )

  const view = viewResult.success
    ? viewResult.data
    : {
        state: "invalid" as const,
        title: "Unable to confirm checkout",
        message:
          "We could not verify this checkout session. If you completed a payment, check My Library or your account.",
        productName: "Purchase",
        purchaseType: "unknown" as const,
        destination: null,
        accessReady: false,
      }

  return (
    <main>
      <Section padding="default">
        <Container className="max-w-2xl">
          <CheckoutSuccessStatus
            sessionId={params.session_id ?? ""}
            initialState={view.state}
            initialMessage={view.message}
            productName={view.productName}
            destinationHref={view.destination?.href ?? null}
            destinationLabel={view.destination?.label ?? null}
            autoRedirect={view.destination?.autoRedirect ?? false}
          />

          <p className="mt-6 text-center text-sm text-ink-soft">
            Questions about your order?{" "}
            <Link href="/dashboard/account" className="font-semibold text-blue hover:text-blue-deep">
              View account
            </Link>
          </p>
        </Container>
      </Section>
    </main>
  )
}
