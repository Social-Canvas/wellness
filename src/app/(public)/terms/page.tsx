import type { Metadata } from "next"
import Link from "next/link"

import { Container, Section } from "@/components/layout"
import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"
import { buildPublicPageMetadata } from "@/lib/seo/site-seo"

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Terms of Service",
  description: "Where approved Terms of Service for Elevate Health Solutions will be published.",
  path: "/terms",
})

export default function TermsPage() {
  return (
    <main>
      <Section padding="default">
        <Container size="prose" className="space-y-4">
          <h1 className="font-display text-[clamp(1.75rem,3vw,2.25rem)] font-medium text-ink">
            Terms of Service
          </h1>
          <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
            Approved Terms of Service for {ELEVATE_BRAND.name} are not on file in
            this product yet. This page is the public location for that copy. It
            is not a substitute for client-approved legal text.
          </p>
          <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
            The client still needs to supply the approved terms covering account
            use, purchases, memberships, acceptable use, and limitation of
            liability.
          </p>
          <p className="text-sm text-ink-soft">
            Related pages:{" "}
            <Link href="/privacy" className="font-semibold text-blue">
              Privacy Policy
            </Link>
            {" · "}
            <Link href="/refund" className="font-semibold text-blue">
              Refund Policy
            </Link>
          </p>
        </Container>
      </Section>
    </main>
  )
}
