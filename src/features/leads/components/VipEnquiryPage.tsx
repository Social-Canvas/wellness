import {
  EnquiryHero,
  EnquiryNextSteps,
  EnquiryPageShell,
  EnquirySummary,
  EnquiryVisual,
} from "@/features/leads/components/enquiry"
import { LeadEnquiryForm } from "@/features/leads/components/LeadEnquiryForm"
import {
  VIP_ENQUIRY_DESCRIPTION,
  VIP_ENQUIRY_EYEBROW,
  VIP_ENQUIRY_HEADING,
  VIP_ENQUIRY_NEXT_STEPS,
  VIP_ENQUIRY_SUMMARY_BENEFITS,
  VIP_ENQUIRY_SUMMARY_HEADING,
} from "@/features/leads/utils/vip-enquiry"
import { BRAND_IMAGES } from "@/lib/brand/images"

type VipEnquiryPageProps = {
  isAuthenticated: boolean
}

function VipEnquiryPage({ isAuthenticated }: VipEnquiryPageProps) {
  return (
    <EnquiryPageShell
      stickySummary
      hero={
        <EnquiryHero
          eyebrow={VIP_ENQUIRY_EYEBROW}
          heading={VIP_ENQUIRY_HEADING}
          description={VIP_ENQUIRY_DESCRIPTION}
        />
      }
      summary={
        <>
          <EnquiryVisual image={BRAND_IMAGES.founderCoachingTreePose} />
          <EnquirySummary
            heading={VIP_ENQUIRY_SUMMARY_HEADING}
            benefits={VIP_ENQUIRY_SUMMARY_BENEFITS}
            headingId="vip-summary-heading"
          />
          <EnquiryNextSteps
            steps={VIP_ENQUIRY_NEXT_STEPS}
            headingId="vip-next-steps-heading"
          />
        </>
      }
      form={<LeadEnquiryForm variant="vip" isAuthenticated={isAuthenticated} />}
    />
  )
}

export { VipEnquiryPage, type VipEnquiryPageProps }
