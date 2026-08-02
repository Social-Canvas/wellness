import Link from "next/link"

import { NonprofitPartnershipForm } from "@/features/leads/components/NonprofitPartnershipForm"
import {
  EnquiryHero,
  EnquiryNextSteps,
  EnquiryPageShell,
} from "@/features/leads/components/enquiry"
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

function NonprofitPartnershipEnquiryPage({
  selectedPlan,
  isAuthenticated,
}: NonprofitPartnershipEnquiryPageProps) {
  return (
    <EnquiryPageShell
      hero={
        <EnquiryHero
          eyebrow={NONPROFIT_ENQUIRY_EYEBROW}
          heading={NONPROFIT_ENQUIRY_HEADING}
          description={NONPROFIT_ENQUIRY_DESCRIPTION}
        />
      }
      summary={
        <>
          <SelectedPlanSummary plan={selectedPlan} />
          <EnquiryNextSteps
            steps={NONPROFIT_ENQUIRY_NEXT_STEPS}
            headingId="nonprofit-next-steps-heading"
          />
        </>
      }
      form={
        <NonprofitPartnershipForm
          planSlug={selectedPlan?.slug ?? null}
          isAuthenticated={isAuthenticated}
        />
      }
    />
  )
}

export {
  NonprofitPartnershipEnquiryPage,
  type NonprofitPartnershipEnquiryPageProps,
}
