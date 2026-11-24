import type { Metadata } from "next"
import Link from "next/link"

import { Container, Section } from "@/components/layout"
import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"
import { buildPublicPageMetadata } from "@/lib/seo/site-seo"

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Refund Policy",
  description: "Where the approved refund policy for Elevate Health Solutions will be published.",
  path: "/refund",
})

export default function RefundPolicyPage() {
  return (
    <main>
      <Section padding="default">
        <Container size="prose" className="space-y-4">
          <h1 className="font-display text-[clamp(1.75rem,3vw,2.25rem)] font-medium text-ink">
            Refund Policy
          </h1>
          <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
            An approved refund policy for {ELEVATE_BRAND.name} is not on file in
            this product yet. Purchases are processed by Stripe. This page does
            not state a refund promise.
          </p>
          <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
            The client still needs to supply the approved refund wording,
            including which products and memberships it covers, the request
            window, and how a customer asks for a review.
          </p>
          <p className="text-sm text-ink-soft">
            See also the{" "}
            <Link href="/terms" className="font-semibold text-blue">
              Terms of Service
            </Link>
            .
          </p>
        </Container>
      </Section>
    </main>
  )
}
