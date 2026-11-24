import type { Metadata } from "next"
import Link from "next/link"

import { ViewItemTracker } from "@/components/analytics/view-item-tracker"
import { Container, Section } from "@/components/layout"
import { ResetPlanOfferBand } from "@/features/checkout/components/reset-plan-offer-band"
import { RESET_PLAN, RESET_PLAN_CTA_FEATURES } from "@/lib/constants/elevate-brand"
import { buildPublicPageMetadata } from "@/lib/seo/site-seo"

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Reset Plan",
  description: RESET_PLAN.description,
  path: "/reset",
})

export default function ResetLandingPage() {
  return (
    <main>
      <ViewItemTracker itemId={RESET_PLAN.slug} itemName={RESET_PLAN.name} />
      <Section padding="default">
        <Container className="max-w-3xl space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue">
            7-Day Elevated Reset
          </p>
          <h1 className="font-display text-[clamp(2rem,4vw,3.25rem)] font-medium text-ink">
            {RESET_PLAN.name}
          </h1>
          <p className="text-base leading-relaxed text-ink-soft sm:text-lg">
            {RESET_PLAN.description}
          </p>
          <ul className="grid gap-2 text-sm text-ink sm:grid-cols-2">
            {RESET_PLAN_CTA_FEATURES.map((feature) => (
              <li key={feature} className="rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3">
                {feature}
              </li>
            ))}
          </ul>
          <p className="text-sm text-ink-soft">
            One-time purchase of {RESET_PLAN.priceLabel}. Membership plans stay on{" "}
            <Link href="/programs" className="font-semibold text-blue">
              Programs
            </Link>
            .
          </p>
        </Container>
      </Section>
      <ResetPlanOfferBand />
    </main>
  )
}
