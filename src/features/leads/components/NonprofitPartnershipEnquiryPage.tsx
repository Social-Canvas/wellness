import Link from "next/link"

import { NonprofitPartnershipForm } from "@/features/leads/components/NonprofitPartnershipForm"
import {
  EnquiryHero,
  EnquiryNextSteps,
  EnquiryPageShell,
} from "@/features/leads/components/enquiry"
import {
  NONPROFIT_ENQUIRY_DESCRIPTION,
  NONPROFIT_ENQUIRY_EYEBROW,
  NONPROFIT_ENQUIRY_HEADING,
  NONPROFIT_ENQUIRY_NEXT_STEPS,
  NONPROFIT_ENQUIRY_PLANS_HREF,
  NONPROFIT_ENQUIRY_SUMMARY_BENEFITS,
  NONPROFIT_ENQUIRY_VIEW_PLANS_LABEL,
} from "@/features/leads/utils/nonprofit-enquiry"

type NonprofitPartnershipEnquiryPageProps = {
  isAuthenticated: boolean
}

function PartnershipSummary() {
  return (
    <section
      aria-labelledby="nonprofit-partnership-summary-heading"
      className="rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6"
    >
      <p className="text-[11px] font-bold tracking-[0.12em] text-green-deep uppercase">
        Partnership overview
      </p>
      <h2
        id="nonprofit-partnership-summary-heading"
        className="mt-1.5 font-display text-xl font-medium text-ink sm:text-2xl"
      >
        Nonprofit partnership enquiry
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Share your organization details and estimated participant needs. Seat
        limits are confirmed after approval. This form does not assign a public
        pricing plan.
      </p>

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
          <PartnershipSummary />
          <EnquiryNextSteps
            steps={NONPROFIT_ENQUIRY_NEXT_STEPS}
            headingId="nonprofit-next-steps-heading"
          />
        </>
      }
      form={<NonprofitPartnershipForm isAuthenticated={isAuthenticated} />}
    />
  )
}

export {
  NonprofitPartnershipEnquiryPage,
  type NonprofitPartnershipEnquiryPageProps,
}
