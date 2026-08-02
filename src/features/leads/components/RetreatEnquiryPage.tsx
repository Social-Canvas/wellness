import {
  EnquiryHero,
  EnquiryNextSteps,
  EnquiryPageShell,
  EnquirySummary,
  EnquiryVisual,
} from "@/features/leads/components/enquiry"
import { LeadEnquiryForm } from "@/features/leads/components/LeadEnquiryForm"
import {
  RETREAT_ENQUIRY_DESCRIPTION,
  RETREAT_ENQUIRY_EYEBROW,
  RETREAT_ENQUIRY_HEADING,
  RETREAT_ENQUIRY_NEXT_STEPS,
  RETREAT_ENQUIRY_SUMMARY_BENEFITS,
  RETREAT_ENQUIRY_SUMMARY_HEADING,
} from "@/features/leads/utils/retreat-enquiry"
import { BRAND_IMAGES } from "@/lib/brand/images"

type RetreatEnquiryPageProps = {
  isAuthenticated: boolean
}

function RetreatEnquiryPage({ isAuthenticated }: RetreatEnquiryPageProps) {
  return (
    <EnquiryPageShell
      stickySummary
      hero={
        <EnquiryHero
          eyebrow={RETREAT_ENQUIRY_EYEBROW}
          heading={RETREAT_ENQUIRY_HEADING}
          description={RETREAT_ENQUIRY_DESCRIPTION}
        />
      }
      summary={
        <>
          <EnquiryVisual image={BRAND_IMAGES.retreatRiver} />
          <EnquirySummary
            heading={RETREAT_ENQUIRY_SUMMARY_HEADING}
            benefits={RETREAT_ENQUIRY_SUMMARY_BENEFITS}
            headingId="retreat-summary-heading"
          />
          <EnquiryNextSteps
            steps={RETREAT_ENQUIRY_NEXT_STEPS}
            headingId="retreat-next-steps-heading"
          />
        </>
      }
      form={<LeadEnquiryForm variant="retreat" isAuthenticated={isAuthenticated} />}
    />
  )
}

export { RetreatEnquiryPage, type RetreatEnquiryPageProps }
