import type { Metadata } from "next"
import Link from "next/link"

import { Container, Section } from "@/components/layout"
import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"

export const metadata: Metadata = {
  title: `Privacy Policy | ${ELEVATE_BRAND.name}`,
  description: `How ${ELEVATE_BRAND.name} collects and uses information submitted through our website.`,
}

export default function PrivacyPolicyPage() {
  return (
    <main>
      <Section padding="default">
        <Container size="prose">
          <h1 className="font-display text-[clamp(1.75rem,3vw,2.25rem)] font-medium text-ink">
            Privacy Policy
          </h1>
          <div className="mt-6 space-y-4 text-sm leading-relaxed text-ink-soft sm:text-base">
            <p>
              When you submit an enquiry or create an account with{" "}
              {ELEVATE_BRAND.name}, we collect the contact and organization
              details you provide so our team can respond and deliver the
              services you request.
            </p>
            <p>
              We do not sell your personal information. Enquiry details may be
              stored securely and reviewed by Elevate staff. Payment details for
              purchases are processed by our payment provider and are not stored
              as full card numbers on Elevate systems.
            </p>
            <p>
              For privacy questions, contact us through the channels listed on
              our{" "}
              <Link
                href="/about"
                className="font-semibold text-blue underline-offset-2 hover:underline"
              >
                About
              </Link>{" "}
              page.
            </p>
          </div>
        </Container>
      </Section>
    </main>
  )
}
