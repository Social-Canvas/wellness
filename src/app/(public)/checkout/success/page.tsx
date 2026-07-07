import type { Metadata } from "next"
import Link from "next/link"

import { BackButton, Container, Section } from "@/components/layout"
import { CheckoutConfirmation } from "@/components/marketing/modals"
import type { CheckoutConsentType } from "@/features/checkout/utils/checkout-urls"
import { getCurrentProfile } from "@/features/auth/services/auth.service"

export const metadata: Metadata = {
  title: "Payment successful",
  description: "Your checkout was completed successfully.",
}

type SuccessPageProps = {
  searchParams: Promise<{
    type?: CheckoutConsentType
    item?: string
    returnTo?: string
  }>
}

function resolveSuccessCopy(type: CheckoutConsentType | undefined) {
  if (type === "membership") {
    return {
      message: "You're enrolled. Welcome to your membership.",
      actionHref: "/dashboard",
      actionLabel: "Go to my dashboard",
      secondaryHref: "/dashboard/library",
      secondaryLabel: "Browse library",
    }
  }

  return {
    message: "Your purchase is confirmed. Access will appear in your account shortly.",
    actionHref: "/dashboard/library",
    actionLabel: "Go to library",
    secondaryHref: "/shop",
    secondaryLabel: "Back to shop",
  }
}

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const profileResult = await getCurrentProfile()
  const params = await searchParams
  const itemName = params.item ? decodeURIComponent(params.item) : "Your purchase"
  const copy = resolveSuccessCopy(params.type)
  const emailNote = profileResult.success
    ? `✓ A receipt and invoice have been emailed to ${profileResult.data.email} automatically.`
    : null

  return (
    <main>
      <Section padding="default">
        <Container className="max-w-2xl">
          <div className="mb-4">
            <BackButton fallbackHref={params.returnTo ?? copy.actionHref} label="← Back" />
          </div>

          <CheckoutConfirmation
            message={copy.message}
            itemName={itemName}
            emailNote={emailNote}
            actionHref={copy.actionHref}
            actionLabel={copy.actionLabel}
            secondaryHref={copy.secondaryHref}
            secondaryLabel={copy.secondaryLabel}
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
