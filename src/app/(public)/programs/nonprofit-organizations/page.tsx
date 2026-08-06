import type { Metadata } from "next"
import Link from "next/link"

import { Container, Section, SectionHeader } from "@/components/layout"
import { buttonVariants } from "@/components/ui/button"
import { NONPROFIT_INQUIRY_CTA, NONPROFIT_INQUIRY_HREF } from "@/features/checkout/utils/membership-audience"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "For Nonprofit Organizations",
  description:
    "Partner with Elevate to provide Platinum-equivalent sponsored memberships for employees, volunteers, and community members.",
}

export default function NonprofitOrganizationsPage() {
  return (
    <main>
      <Section padding="default">
        <Container className="max-w-3xl">
          <SectionHeader
            eyebrow="For Nonprofit Organizations"
            title="One partnership. Individual accounts."
            subtitle="Provide employees, volunteers, or community members with individual Elevate accounts through a sponsored nonprofit partnership. Seat limits are confirmed after approval — there is no shared organization login."
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={NONPROFIT_INQUIRY_HREF}
              className={cn(buttonVariants({ size: "lg" }))}
            >
              {NONPROFIT_INQUIRY_CTA}
            </Link>
            <Link
              href="/programs?membership=individuals#memberships"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              View individual memberships
            </Link>
          </div>
        </Container>
      </Section>

      <Section variant="soft" padding="default">
        <Container className="max-w-3xl">
          <h2 className="font-display text-2xl font-medium text-ink md:text-3xl">
            What organizations receive
          </h2>
          <ul className="mt-6 list-disc space-y-2 pl-5 text-ink-soft">
            <li>Platinum-equivalent sponsored access for each participant</li>
            <li>One reusable organization access code up to the approved seat limit</li>
            <li>Organization administrator dashboard for seats and members</li>
            <li>Billing handled at the organization level — not personal Stripe subscriptions</li>
          </ul>
          <Link
            href={NONPROFIT_INQUIRY_HREF}
            className={cn(buttonVariants({ size: "lg" }), "mt-6 inline-flex")}
          >
            {NONPROFIT_INQUIRY_CTA}
          </Link>
        </Container>
      </Section>
    </main>
  )
}
