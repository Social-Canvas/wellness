import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

import { submitLeadSchema } from "../schemas/submit-lead.ts"
import {
  APPROVED_ENQUIRY_INTENTS,
  APPROVED_LEAD_INTENTS,
  ENQUIRY_EDUCATIONAL_DISCLAIMER,
  isApprovedLeadIntent,
} from "./enquiry-intents.ts"
import {
  RETREAT_ENQUIRY_CTA,
  RETREAT_ENQUIRY_DESCRIPTION,
  RETREAT_ENQUIRY_EYEBROW,
  RETREAT_ENQUIRY_FORM_HEADING,
  RETREAT_ENQUIRY_HEADING,
  RETREAT_ENQUIRY_INTENT,
  RETREAT_ENQUIRY_NEXT_STEPS,
  RETREAT_ENQUIRY_NO_PURCHASE,
  RETREAT_ENQUIRY_SOURCE,
  RETREAT_ENQUIRY_SUCCESS_BODY,
  RETREAT_ENQUIRY_SUCCESS_HEADING,
  RETREAT_ENQUIRY_SUMMARY_BENEFITS,
  RETREAT_ENQUIRY_SUMMARY_HEADING,
  buildRetreatEnquiryMetadata,
  composeRetreatEnquiryMessage,
} from "./retreat-enquiry.ts"
import {
  VIP_ENQUIRY_CTA,
  VIP_ENQUIRY_DESCRIPTION,
  VIP_ENQUIRY_EYEBROW,
  VIP_ENQUIRY_FORM_HEADING,
  VIP_ENQUIRY_HEADING,
  VIP_ENQUIRY_INTENT,
  VIP_ENQUIRY_MESSAGE_LABEL,
  VIP_ENQUIRY_NEXT_STEPS,
  VIP_ENQUIRY_NO_PURCHASE,
  VIP_ENQUIRY_SOURCE,
  VIP_ENQUIRY_SUCCESS_BODY,
  VIP_ENQUIRY_SUCCESS_HEADING,
  VIP_ENQUIRY_SUMMARY_BENEFITS,
  VIP_ENQUIRY_SUMMARY_HEADING,
  buildVipEnquiryMetadata,
} from "./vip-enquiry.ts"
import {
  NONPROFIT_ENQUIRY_EYEBROW,
  NONPROFIT_ENQUIRY_HEADING,
} from "./nonprofit-enquiry.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..")

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

function retreatPageSource(): string {
  return readSrc("app/(public)/retreats/page.tsx")
}

function vipPageSource(): string {
  return readSrc("app/(public)/vip/page.tsx")
}

function retreatEnquiryPageSource(): string {
  return readSrc("features/leads/components/RetreatEnquiryPage.tsx")
}

function vipEnquiryPageSource(): string {
  return readSrc("features/leads/components/VipEnquiryPage.tsx")
}

function formSource(): string {
  return readSrc("features/leads/components/LeadEnquiryForm.tsx")
}

function shellSource(): string {
  return readSrc("features/leads/components/enquiry/EnquiryPageShell.tsx")
}

function visualSource(): string {
  return readSrc("features/leads/components/enquiry/EnquiryVisual.tsx")
}

function formCardSource(): string {
  return readSrc("features/leads/components/enquiry/EnquiryFormCard.tsx")
}

function successSource(): string {
  return readSrc("features/leads/components/enquiry/EnquirySuccessPanel.tsx")
}

function serviceSource(): string {
  return readSrc("features/leads/services/leads.service.ts")
}

function nonprofitEnquiryPageSource(): string {
  return readSrc(
    "features/leads/components/NonprofitPartnershipEnquiryPage.tsx"
  )
}

// 1. Retreat page uses the approved two-column layout
test("1. Retreat page uses the approved two-column layout", () => {
  const page = retreatEnquiryPageSource()
  const shell = shellSource()
  assert.match(page, /EnquiryPageShell/)
  assert.match(page, /stickySummary/)
  assert.match(shell, /max-w-6xl/)
  assert.match(shell, /0\.42fr/)
  assert.match(shell, /0\.58fr/)
  assert.match(shell, /min-\[900px\]:grid-cols-/)
  assert.match(retreatPageSource(), /RetreatEnquiryPage/)
})

// 2. VIP page uses the approved two-column layout
test("2. VIP page uses the approved two-column layout", () => {
  const page = vipEnquiryPageSource()
  const shell = shellSource()
  assert.match(page, /EnquiryPageShell/)
  assert.match(page, /stickySummary/)
  assert.match(shell, /max-w-6xl/)
  assert.match(shell, /0\.42fr/)
  assert.match(shell, /0\.58fr/)
  assert.match(vipPageSource(), /VipEnquiryPage/)
})

// 3. Retreat image is no longer rendered as a tiny detached thumbnail
test("3. Retreat image is no longer rendered as a tiny detached thumbnail", () => {
  const page = retreatEnquiryPageSource()
  const route = retreatPageSource()
  assert.match(page, /EnquiryVisual/)
  assert.match(page, /BRAND_IMAGES\.retreatRiver/)
  assert.doesNotMatch(route, /LeadPageShell/)
  assert.doesNotMatch(visualSource(), /aspect-\[4\/5\]/)
  assert.match(visualSource(), /aspect-\[5\/4\]/)
  assert.match(visualSource(), /w-full/)
})

// 4. VIP image is no longer rendered as a tiny detached thumbnail
test("4. VIP image is no longer rendered as a tiny detached thumbnail", () => {
  const page = vipEnquiryPageSource()
  const route = vipPageSource()
  assert.match(page, /EnquiryVisual/)
  assert.match(page, /BRAND_IMAGES\.founderCoachingTreePose/)
  assert.doesNotMatch(route, /LeadPageShell/)
  assert.match(visualSource(), /aspect-\[5\/4\]/)
  assert.match(visualSource(), /rounded-2xl/)
})

// 5. Both images use responsive sizing and meaningful alt text
test("5. Both images use responsive sizing and meaningful alt text", () => {
  const visual = visualSource()
  const brandImage = readSrc("components/media/brand-image.tsx")
  const images = readSrc("lib/brand/images.ts")
  assert.match(visual, /sizes="/)
  assert.match(visual, /42vw/)
  assert.match(brandImage, /object-cover/)
  assert.match(
    images,
    /retreatRiver:[\s\S]*?alt: "Group meditation at sunrise beside a tranquil river/
  )
  assert.match(
    images,
    /founderCoachingTreePose:[\s\S]*?alt: "Dr\. Deepa Pattani practicing tree pose/
  )
})

// 6. Retreat copy and CTA render correctly
test("6. Retreat copy and CTA render correctly", () => {
  const page = retreatEnquiryPageSource()
  const form = formSource()
  assert.equal(RETREAT_ENQUIRY_EYEBROW, "ELEVATE RETREATS")
  assert.equal(RETREAT_ENQUIRY_HEADING, "Step away. Reset deeply.")
  assert.match(RETREAT_ENQUIRY_DESCRIPTION, /nervous-system restoration/)
  assert.equal(RETREAT_ENQUIRY_SUMMARY_HEADING, "Retreat interest")
  assert.equal(RETREAT_ENQUIRY_SUMMARY_BENEFITS.length, 5)
  assert.equal(RETREAT_ENQUIRY_NEXT_STEPS.length, 3)
  assert.equal(RETREAT_ENQUIRY_FORM_HEADING, "Enquire about an Elevate retreat")
  assert.equal(RETREAT_ENQUIRY_CTA, "Enquire about retreats")
  assert.equal(
    RETREAT_ENQUIRY_NO_PURCHASE,
    "Submitting this form does not reserve a place or create a purchase."
  )
  assert.match(page, /RETREAT_ENQUIRY_EYEBROW/)
  assert.match(page, /RETREAT_ENQUIRY_HEADING/)
  assert.match(form, /RETREAT_ENQUIRY_CTA/)
  assert.doesNotMatch(RETREAT_ENQUIRY_DESCRIPTION, /\d{4}/)
  assert.doesNotMatch(RETREAT_ENQUIRY_NEXT_STEPS.join(" "), /within \d+/)
})

// 7. VIP copy and CTA render correctly
test("7. VIP copy and CTA render correctly", () => {
  const page = vipEnquiryPageSource()
  const form = formSource()
  assert.equal(VIP_ENQUIRY_EYEBROW, "VIP COACHING")
  assert.equal(
    VIP_ENQUIRY_HEADING,
    "Personalized support for deeper transformation"
  )
  assert.match(VIP_ENQUIRY_DESCRIPTION, /Dr\. Deepa Pattani/)
  assert.equal(
    VIP_ENQUIRY_SUMMARY_HEADING,
    "A personalized coaching enquiry"
  )
  assert.equal(VIP_ENQUIRY_SUMMARY_BENEFITS.length, 4)
  assert.equal(VIP_ENQUIRY_NEXT_STEPS.length, 3)
  assert.equal(VIP_ENQUIRY_FORM_HEADING, "Enquire about VIP Coaching")
  assert.equal(VIP_ENQUIRY_CTA, "Enquire about VIP Coaching")
  assert.equal(
    VIP_ENQUIRY_MESSAGE_LABEL,
    "What would you like support with? (optional)"
  )
  assert.equal(
    VIP_ENQUIRY_NO_PURCHASE,
    "Submitting an enquiry does not create a coaching agreement or purchase."
  )
  assert.match(page, /VIP_ENQUIRY_EYEBROW/)
  assert.match(form, /VIP_ENQUIRY_CTA/)
  assert.match(form, /VIP_ENQUIRY_MESSAGE_LABEL/)
  assert.doesNotMatch(form, /medical history|diagnosis|diagnoses/i)
})

// 8. Existing intent values are preserved
test("8. Existing intent values are preserved", () => {
  assert.equal(RETREAT_ENQUIRY_INTENT, "retreat")
  assert.equal(VIP_ENQUIRY_INTENT, "vip")
  assert.equal(RETREAT_ENQUIRY_SOURCE, "retreats_page")
  assert.equal(VIP_ENQUIRY_SOURCE, "vip_page")
  assert.deepEqual([...APPROVED_LEAD_INTENTS], [
    "vip",
    "retreat",
    "private_event",
    "free_taster",
  ])
  assert.ok(APPROVED_ENQUIRY_INTENTS.includes("retreat"))
  assert.ok(APPROVED_ENQUIRY_INTENTS.includes("vip"))
  assert.ok(APPROVED_ENQUIRY_INTENTS.includes("nonprofit-partnership"))
  const form = formSource()
  assert.match(form, /leadType: config\.leadType/)
  assert.match(form, /RETREAT_ENQUIRY_INTENT/)
  assert.match(form, /VIP_ENQUIRY_INTENT/)
})

// 9. Arbitrary intent values are rejected
test("9. Arbitrary intent values are rejected", () => {
  assert.equal(isApprovedLeadIntent("retreat"), true)
  assert.equal(isApprovedLeadIntent("vip"), true)
  assert.equal(isApprovedLeadIntent("hacked"), false)
  assert.equal(isApprovedLeadIntent("<script>"), false)
  assert.equal(isApprovedLeadIntent(""), false)
  assert.equal(isApprovedLeadIntent(undefined), false)
  const parsed = submitLeadSchema.safeParse({
    leadType: "not-a-real-intent",
    name: "Test",
    email: "test@example.com",
  })
  assert.equal(parsed.success, false)
})

// 10. Existing form submission behavior remains intact
test("10. Existing form submission behavior remains intact", () => {
  const form = formSource()
  const service = serviceSource()
  assert.match(form, /submitLeadAction/)
  assert.match(form, /leadType: config\.leadType/)
  assert.match(form, /source: config\.source/)
  assert.match(service, /\.from\("leads"\)/)
  assert.match(service, /lead_type: parsed\.data\.leadType/)
  assert.match(service, /metadata: toJsonMetadata/)
  const message = composeRetreatEnquiryMessage({
    message: "Looking for a weekend reset",
    preferredTiming: "summer",
    attendeeCount: "2",
  })
  assert.match(message ?? "", /Preferred timing: Summer/)
  assert.match(message ?? "", /Number of attendees: 2/)
  assert.match(message ?? "", /Looking for a weekend reset/)
  const metadata = buildRetreatEnquiryMetadata({
    preferredTiming: "summer",
    attendeeCount: "2",
  })
  assert.equal(metadata.intent, "retreat")
  assert.equal(metadata.preferredTiming, "summer")
  assert.equal(buildVipEnquiryMetadata().intent, "vip")
})

// 11. Duplicate submissions are prevented
test("11. Duplicate submissions are prevented", () => {
  const form = formSource()
  assert.match(form, /submitLocked/)
  assert.match(form, /setSubmitLocked\(true\)/)
  assert.match(
    form,
    /disabled=\{isPending \|\| submitted \|\| submitLocked\}/
  )
  assert.match(form, /if \(submitLocked \|\| isPending \|\| submitted\)/)
})

// 12. Recoverable errors preserve field values
test("12. Recoverable errors preserve field values", () => {
  const form = formSource()
  assert.match(form, /setSubmitLocked\(false\)/)
  assert.match(form, /setServerError\(result\.error\.message\)/)
  assert.doesNotMatch(form, /reset\(/)
})

// 13. Correct success panel renders for each intent
test("13. Correct success panel renders for each intent", () => {
  const form = formSource()
  assert.match(form, /EnquirySuccessPanel/)
  assert.equal(
    RETREAT_ENQUIRY_SUCCESS_HEADING,
    "Thank you. Your retreat enquiry has been received"
  )
  assert.match(
    RETREAT_ENQUIRY_SUCCESS_BODY,
    /follow up when suitable retreat information is available/
  )
  assert.equal(
    VIP_ENQUIRY_SUCCESS_HEADING,
    "Thank you. Your VIP Coaching enquiry has been received"
  )
  assert.match(
    VIP_ENQUIRY_SUCCESS_BODY,
    /fit, availability and next steps/
  )
  assert.match(form, /RETREAT_ENQUIRY_SUCCESS_HEADING/)
  assert.match(form, /VIP_ENQUIRY_SUCCESS_HEADING/)
  assert.match(successSource(), /Return to Programs/)
  assert.match(successSource(), /Go to Dashboard/)
})

// 14. Medical disclaimer has reduced visual prominence
test("14. Medical disclaimer has reduced visual prominence", () => {
  const form = formSource()
  assert.match(form, /ENQUIRY_EDUCATIONAL_DISCLAIMER/)
  assert.doesNotMatch(form, /bg-cream2/)
  assert.match(form, /text-xs leading-relaxed text-ink-soft\/80/)
  assert.equal(
    ENQUIRY_EDUCATIONAL_DISCLAIMER,
    "Elevate content and services are educational and are not a substitute for individualized medical care."
  )
})

// 15. Privacy link is present
test("15. Privacy link is present", () => {
  const form = formSource()
  assert.match(form, /href="\/privacy"/)
  assert.match(form, /Privacy Policy/)
})

// 16. Mobile layout stacks without overflow
test("16. Mobile layout stacks without overflow", () => {
  const shell = shellSource()
  assert.match(shell, /overflow-x-hidden/)
  assert.match(shell, /grid-cols-1/)
  assert.match(shell, /min-w-0/)
  assert.match(shell, /px-4/)
  assert.match(retreatEnquiryPageSource(), /EnquiryVisual/)
  assert.match(vipEnquiryPageSource(), /EnquiryVisual/)
})

// 17. Desktop form width matches the nonprofit page
test("17. Desktop form width matches the nonprofit page", () => {
  assert.match(formCardSource(), /max-w-\[620px\]/)
  assert.match(formCardSource(), /rounded-2xl/)
  assert.match(formCardSource(), /p-6 shadow-sm sm:p-8/)
  assert.match(formSource(), /EnquiryFormCard/)
  assert.match(
    readSrc("features/leads/components/NonprofitPartnershipForm.tsx"),
    /EnquiryFormCard/
  )
})

// 18. Keyboard focus and validation remain accessible
test("18. Keyboard focus and validation remain accessible", () => {
  const form = formSource()
  const success = successSource()
  assert.match(form, /setFocus\(first\)/)
  assert.match(form, /onInvalid/)
  assert.match(form, /aria-describedby/)
  assert.match(form, /aria-invalid/)
  assert.match(form, /aria-required/)
  assert.match(form, /noValidate/)
  assert.match(success, /successRef\.current\?\.focus/)
  assert.match(success, /tabIndex=\{-1\}/)
})

// 19. Authenticated and signed-out navigation both work
test("19. Authenticated and signed-out navigation both work", () => {
  assert.match(retreatPageSource(), /getCurrentUser/)
  assert.match(vipPageSource(), /getCurrentUser/)
  assert.match(retreatPageSource(), /isAuthenticated/)
  assert.match(vipPageSource(), /isAuthenticated/)
  assert.match(successSource(), /isAuthenticated/)
  assert.match(successSource(), /Go to Dashboard/)
  assert.match(formSource(), /isAuthenticated/)
})

// 20. Nonprofit enquiry page remains unchanged visually
test("20. Nonprofit enquiry page remains unchanged visually", () => {
  const nonprofit = nonprofitEnquiryPageSource()
  assert.match(nonprofit, /EnquiryPageShell/)
  assert.doesNotMatch(nonprofit, /stickySummary/)
  assert.match(nonprofit, /PartnershipSummary/)
  assert.match(nonprofit, /NONPROFIT_ENQUIRY_EYEBROW/)
  assert.match(nonprofit, /NONPROFIT_ENQUIRY_HEADING/)
  assert.equal(NONPROFIT_ENQUIRY_EYEBROW, "NONPROFIT PARTNERSHIPS")
  assert.equal(NONPROFIT_ENQUIRY_HEADING, "Let’s support your organization")
  assert.doesNotMatch(nonprofit, /EnquiryVisual|BrandImage|LeadPageShell/)
  assert.match(
    readSrc("features/leads/components/NonprofitPartnershipForm.tsx"),
    /EDUCATIONAL_DISCLAIMER/
  )
})
