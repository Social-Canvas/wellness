import type { Metadata } from "next"
import Link from "next/link"

import { Container, Section, SectionHeader } from "@/components/layout"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "For Nonprofit Organizations",
  description:
    "Nonprofit partnership enrollment for employees, volunteers, members, and communities — one shared Elevate content experience with sponsored or discounted access.",
}

const EMPLOYEE_TIERS = [
  { name: "Small (up to 25)", price: "$497/month" },
  { name: "Mid-size (25–75)", price: "$997/month" },
  { name: "Large (75–200)", price: "$1,997/month" },
  { name: "Enterprise (200+)", price: "Custom pricing" },
] as const

export default function NonprofitOrganizationsPage() {
  return (
    <main>
      <Section padding="default">
        <Container className="max-w-3xl">
          <SectionHeader
            eyebrow="For Nonprofit Organizations"
            title="One partnership. Two enrollment paths."
            subtitle="The contracting organization is a nonprofit. Employees and volunteers can receive organization-sponsored access, while members and community participants can receive sponsored, discounted, or hybrid access. Both paths reuse the same Elevate content and sessions. Each person signs in with their own account — there is no shared organization login."
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="#partner"
              className={cn(buttonVariants({ size: "lg" }))}
            >
              Partner with Elevate
            </Link>
            <Link
              href="/programs#individuals"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              View individual memberships
            </Link>
          </div>
        </Container>
      </Section>

      <Section
        id="employees-volunteers"
        className="scroll-mt-24"
        variant="soft"
        padding="default"
      >
        <Container className="max-w-3xl">
          <h2 className="font-display text-2xl font-medium text-ink md:text-3xl">
            Employee and volunteer access
          </h2>
          <p className="mt-3 text-ink-soft">
            Organization-sponsored seats for nonprofit employees and volunteers.
            Working tier pricing is guidance for proposals — Checkout is not
            enabled for these ranges until confirmed.
          </p>
          <ul className="mt-6 space-y-3">
            {EMPLOYEE_TIERS.map((tier) => (
              <li
                key={tier.name}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl border border-line bg-surface px-4 py-3"
              >
                <span className="font-semibold text-ink">{tier.name}</span>
                <span className="text-ink-soft">{tier.price}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-ink-soft">
            Optional add-on: Monthly Leadership Reset Session (proposal only).
          </p>
        </Container>
      </Section>

      <Section id="members-community" className="scroll-mt-24" padding="default">
        <Container className="max-w-3xl">
          <h2 className="font-display text-2xl font-medium text-ink md:text-3xl">
            Member and community access
          </h2>
          <p className="mt-3 text-ink-soft">
            Sponsored, discounted, or hybrid models for people served by the
            nonprofit. Range-priced options lead to partnership inquiry — not
            self-serve Checkout.
          </p>
          <ul className="mt-6 list-disc space-y-2 pl-5 text-ink-soft">
            <li>Sponsored access</li>
            <li>Discounted access (working reference: $19–$29/month)</li>
            <li>
              Hybrid subsidy (working reference: $500–$1,000/month plus member fee)
            </li>
            <li>
              Annual option (working reference: $199/year) — not purchasable until
              approved
            </li>
          </ul>
        </Container>
      </Section>

      <Section id="partner" className="scroll-mt-24" variant="soft" padding="default">
        <Container className="max-w-3xl">
          <h2 className="font-display text-2xl font-medium text-ink md:text-3xl">
            Partner with Elevate
          </h2>
          <p className="mt-3 text-ink-soft">
            Tell us about your nonprofit, approximate team or community size, and
            which enrollment path you need. We will follow up with a proposal —
            no invented fixed Checkout prices.
          </p>
          <Link
            href="/private-events?intent=nonprofit-partnership"
            className={cn(buttonVariants({ size: "lg" }), "mt-6 inline-flex")}
          >
            Request a nonprofit partnership proposal
          </Link>
        </Container>
      </Section>
    </main>
  )
}
