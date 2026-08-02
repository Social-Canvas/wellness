import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { NonprofitPartnershipForm } from "@/features/leads/components/NonprofitPartnershipForm"
import {
  NONPROFIT_CUSTOM_PRICING_LABEL,
  type NonprofitSeatPlan,
} from "@/features/checkout/utils/membership-audience"
import {
  NONPROFIT_ENQUIRY_DESCRIPTION,
  NONPROFIT_ENQUIRY_EYEBROW,
  NONPROFIT_ENQUIRY_HEADING,
  NONPROFIT_ENQUIRY_NEXT_STEPS,
  NONPROFIT_ENQUIRY_PLANS_HREF,
  NONPROFIT_ENQUIRY_SUMMARY_BENEFITS,
  NONPROFIT_ENQUIRY_VIEW_PLANS_LABEL,
  formatNonprofitPlanPrice,
} from "@/features/leads/utils/nonprofit-enquiry"

type NonprofitPartnershipEnquiryPageProps = {
  selectedPlan: NonprofitSeatPlan | null
  isAuthenticated: boolean
}

function SelectedPlanSummary({
  plan,
}: {
  plan: NonprofitSeatPlan | null
}) {
  return (
    <section
      aria-labelledby="nonprofit-selected-plan-heading"
      className="rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6"
    >
      <p className="text-[11px] font-bold tracking-[0.12em] text-green-deep uppercase">
        Selected plan
      </p>
      {plan ? (
        <>
          <h2
            id="nonprofit-selected-plan-heading"
            className="mt-1.5 font-display text-xl font-medium text-ink sm:text-2xl"
          >
            {plan.name}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">{plan.seatRangeLabel}</p>
          <p className="mt-2 font-display text-[26px] font-semibold leading-tight text-ink">
            {plan.priceLabel}
            <small className="ml-1 font-body text-sm font-normal text-ink-soft">
              {plan.priceSuffix}
            </small>
          </p>
          {plan.customPricing ? (
            <p className="mt-1 text-sm text-ink-soft">
              {NONPROFIT_CUSTOM_PRICING_LABEL}
            </p>
          ) : null}
          <span className="sr-only">{formatNonprofitPlanPrice(plan)}</span>
        </>
      ) : (
        <>
          <h2
            id="nonprofit-selected-plan-heading"
            className="mt-1.5 font-display text-xl font-medium text-ink sm:text-2xl"
          >
            Nonprofit partnership enquiry
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Share your organization details and we will help match the right
            participant plan.
          </p>
        </>
      )}

      <ul className="mt-5 space-y-2">
        {NONPROFIT_ENQUIRY_SUMMARY_BENEFITS.map((benefit) => (
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

      <Link
        href={NONPROFIT_ENQUIRY_PLANS_HREF}
        className="mt-5 inline-flex text-sm font-semibold text-blue underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2"
      >
        {NONPROFIT_ENQUIRY_VIEW_PLANS_LABEL}
      </Link>
    </section>
  )
}

function WhatHappensNext() {
  return (
    <section
      aria-labelledby="nonprofit-next-steps-heading"
      className="mt-6 rounded-2xl border border-line bg-green/5 p-5 sm:p-6"
    >
      <h2
        id="nonprofit-next-steps-heading"
        className="font-display text-lg font-medium text-ink"
      >
        What happens next
      </h2>
      <ol className="mt-4 space-y-3">
        {NONPROFIT_ENQUIRY_NEXT_STEPS.map((step, index) => (
          <li key={step} className="flex items-start gap-3 text-sm text-ink-soft">
            <span
              aria-hidden
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-blue ring-1 ring-line"
            >
              {index + 1}
            </span>
            <span className="pt-1">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function NonprofitPartnershipEnquiryPage({
  selectedPlan,
  isAuthenticated,
}: NonprofitPartnershipEnquiryPageProps) {
  return (
    <main className="overflow-x-hidden">
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-12 sm:px-6 sm:pt-10 sm:pb-16 lg:px-8">
        <header className="max-w-2xl">
          <Badge variant="eyebrow">{NONPROFIT_ENQUIRY_EYEBROW}</Badge>
          <h1 className="mt-3 font-display text-[clamp(1.75rem,3.2vw,2.5rem)] font-medium tracking-tight text-ink">
            {NONPROFIT_ENQUIRY_HEADING}
          </h1>
          <p className="mt-3.5 text-base text-ink-soft">
            {NONPROFIT_ENQUIRY_DESCRIPTION}
          </p>
        </header>

        <div className="mt-8 grid grid-cols-1 items-start gap-8 min-[900px]:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] min-[900px]:gap-10 lg:gap-12">
          <aside className="min-w-0">
            <SelectedPlanSummary plan={selectedPlan} />
            <WhatHappensNext />
          </aside>

          <div className="min-w-0">
            <NonprofitPartnershipForm
              planSlug={selectedPlan?.slug ?? null}
              isAuthenticated={isAuthenticated}
            />
          </div>
        </div>
      </div>
    </main>
  )
}

export {
  NonprofitPartnershipEnquiryPage,
  type NonprofitPartnershipEnquiryPageProps,
}
