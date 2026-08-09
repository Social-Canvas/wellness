import type { Metadata } from "next"
import Link from "next/link"

import { Container, Section, SectionHeader } from "@/components/layout"
import { buttonVariants } from "@/components/ui/button"
import {
  NONPROFIT_HOW_IT_WORKS_HEADING,
  NONPROFIT_HOW_IT_WORKS_STEPS,
  NONPROFIT_INQUIRY_CTA,
  NONPROFIT_INQUIRY_HREF,
  NONPROFIT_LANDING_EYEBROW,
  NONPROFIT_MEMBERSHIP_BENEFITS,
  NONPROFIT_MISSION_BODY,
  NONPROFIT_MISSION_HEADING,
  NONPROFIT_SEE_WHATS_INCLUDED_CTA,
  NONPROFIT_SHARED_BENEFITS_TITLE,
  NONPROFIT_START_CONVERSATION_CTA,
  NONPROFIT_SUPPORTING_NOTE,
  buildNonprofitMembershipBenefits,
} from "@/features/checkout/utils/membership-audience"
import { ELEVATE_BRAND, ELEVATE_MEMBERSHIPS } from "@/lib/constants/elevate-brand"
import { cn } from "@/lib/utils"

const platinumFeatures =
  ELEVATE_MEMBERSHIPS.find((tier) => tier.slug === "plan-3")?.features ?? []

const partnershipBenefits = buildNonprofitMembershipBenefits(platinumFeatures)

export const metadata: Metadata = {
  title: `Nonprofit Partnerships | ${ELEVATE_BRAND.name}`,
  description:
    "Explore Elevate nonprofit partnerships that provide sponsored access to programs, live sessions, recorded resources, and supportive wellness experiences.",
  alternates: {
    canonical: "/nonprofits",
  },
}

export default function NonprofitsLandingPage() {
  const benefits =
    partnershipBenefits.length > 0
      ? partnershipBenefits
      : NONPROFIT_MEMBERSHIP_BENEFITS

  return (
    <main>
      <Section padding="default">
        <Container className="max-w-3xl text-center">
          <SectionHeader
            align="center"
            eyebrow={NONPROFIT_LANDING_EYEBROW}
            title={NONPROFIT_MISSION_HEADING}
            subtitle={NONPROFIT_MISSION_BODY}
          />
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={NONPROFIT_INQUIRY_HREF}
              className={cn(
                buttonVariants({ size: "lg" }),
                "min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
              )}
            >
              {NONPROFIT_INQUIRY_CTA}
            </Link>
            <Link
              href="#nonprofit-benefits"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
              )}
            >
              {NONPROFIT_SEE_WHATS_INCLUDED_CTA}
            </Link>
          </div>
        </Container>
      </Section>

      <Section id="nonprofit-benefits" variant="soft" padding="default">
        <Container>
          <SectionHeader
            align="center"
            eyebrow="What's included"
            title={NONPROFIT_SHARED_BENEFITS_TITLE}
            subtitle="Nonprofit-sponsored participants receive Platinum-equivalent access for their individual Elevate accounts."
          />
          <ul className="mx-auto mt-9 grid max-w-[1100px] list-none grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <li
                key={benefit}
                className="flex items-start gap-2 text-sm text-ink-soft"
              >
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-blue/10 text-[10px] font-bold text-blue"
                >
                  ✓
                </span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-ink-soft">
            {NONPROFIT_SUPPORTING_NOTE}
          </p>
        </Container>
      </Section>

      <Section padding="default">
        <Container className="max-w-3xl">
          <SectionHeader
            align="center"
            eyebrow="Partnership path"
            title={NONPROFIT_HOW_IT_WORKS_HEADING}
            subtitle="A simple path from first conversation to sponsored access for your community. Seat limits and pricing are confirmed privately with your organization."
          />
          <ol className="mt-9 space-y-5">
            {NONPROFIT_HOW_IT_WORKS_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span
                  aria-hidden
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-blue/10 font-display text-sm font-semibold text-blue"
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-display text-lg font-medium text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-9 flex justify-center">
            <Link
              href={NONPROFIT_INQUIRY_HREF}
              className={cn(
                buttonVariants({ size: "lg" }),
                "min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
              )}
            >
              {NONPROFIT_START_CONVERSATION_CTA}
            </Link>
          </div>
        </Container>
      </Section>
    </main>
  )
}
