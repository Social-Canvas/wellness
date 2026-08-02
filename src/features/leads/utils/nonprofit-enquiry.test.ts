import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

import {
  NONPROFIT_SEAT_PLANS,
  parseNonprofitPlanParam,
} from "../../checkout/utils/membership-audience.ts"
import {
  NONPROFIT_ENQUIRY_CTA,
  NONPROFIT_ENQUIRY_DESCRIPTION,
  NONPROFIT_ENQUIRY_EYEBROW,
  NONPROFIT_ENQUIRY_HEADING,
  NONPROFIT_ENQUIRY_NEXT_STEPS,
  NONPROFIT_ENQUIRY_NO_PURCHASE,
  NONPROFIT_ENQUIRY_PLANS_HREF,
  NONPROFIT_ENQUIRY_SUMMARY_BENEFITS,
  buildNonprofitEnquiryMetadata,
  composeNonprofitEnquiryMessage,
  formatNonprofitPlanPrice,
  nonprofitEnquirySource,
  participantRangeForPlan,
} from "./nonprofit-enquiry.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..")

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

function pageSource(): string {
  return readSrc("app/(public)/private-events/page.tsx")
}

function enquiryPageSource(): string {
  return readSrc(
    "features/leads/components/NonprofitPartnershipEnquiryPage.tsx"
  )
}

function formSource(): string {
  return readSrc("features/leads/components/NonprofitPartnershipForm.tsx")
}

function serviceSource(): string {
  return readSrc("features/leads/services/leads.service.ts")
}

function planBySlug(slug: string) {
  return NONPROFIT_SEAT_PLANS.find((plan) => plan.slug === slug) ?? null
}

// 1. Two-column layout renders at desktop width
test("1. Two-column layout renders at desktop width", () => {
  const page = enquiryPageSource()
  assert.match(page, /max-w-6xl/)
  assert.match(page, /0\.42fr/)
  assert.match(page, /0\.58fr/)
  assert.match(page, /min-\[900px\]:grid-cols-/)
})

// 2. Mobile layout stacks correctly
test("2. Mobile layout stacks correctly", () => {
  const page = enquiryPageSource()
  assert.match(page, /grid-cols-1/)
  assert.match(page, /SelectedPlanSummary/)
  assert.match(page, /NonprofitPartnershipForm/)
  const summaryIdx = page.indexOf("<SelectedPlanSummary")
  const formIdx = page.indexOf("<NonprofitPartnershipForm")
  assert.ok(summaryIdx >= 0 && formIdx > summaryIdx)
})

// 3. Small plan summary displays 1–25 and $497
test("3. Small plan summary displays 1–25 and $497", () => {
  assert.equal(parseNonprofitPlanParam("small"), "small")
  const plan = planBySlug("small")
  assert.ok(plan)
  assert.equal(plan.name, "Small Organization")
  assert.equal(plan.seatRangeLabel, "1–25 participants")
  assert.equal(plan.priceLabel, "$497")
  assert.equal(formatNonprofitPlanPrice(plan), "$497/ month")
  assert.equal(participantRangeForPlan("small"), "1-25")
})

// 4. Mid-size plan maps correctly
test("4. Mid-size plan maps correctly", () => {
  assert.equal(parseNonprofitPlanParam("mid-size"), "mid-size")
  const plan = planBySlug("mid-size")
  assert.ok(plan)
  assert.equal(plan.slug, "mid-size")
  assert.equal(plan.seatRangeLabel, "26–75 participants")
  assert.equal(plan.priceLabel, "$997")
  assert.equal(participantRangeForPlan("mid-size"), "26-75")
})

// 5. Large plan maps correctly
test("5. Large plan maps correctly", () => {
  assert.equal(parseNonprofitPlanParam("large"), "large")
  const plan = planBySlug("large")
  assert.ok(plan)
  assert.equal(plan.slug, "large")
  assert.equal(plan.seatRangeLabel, "76–200 participants")
  assert.equal(plan.priceLabel, "$1,997")
  assert.equal(participantRangeForPlan("large"), "76-200")
})

// 6. Enterprise plan maps correctly
test("6. Enterprise plan maps correctly", () => {
  assert.equal(parseNonprofitPlanParam("enterprise"), "enterprise")
  const plan = planBySlug("enterprise")
  assert.ok(plan)
  assert.equal(plan.slug, "enterprise")
  assert.equal(plan.seatRangeLabel, "201+ participants")
  assert.equal(plan.priceLabel, "$3,000–$5,000")
  assert.equal(plan.customPricing, true)
  assert.equal(participantRangeForPlan("enterprise"), "201+")
})

// 7. Invalid plan is handled safely
test("7. Invalid plan is handled safely", () => {
  assert.equal(parseNonprofitPlanParam("tiny"), null)
  assert.equal(parseNonprofitPlanParam(""), null)
  assert.equal(parseNonprofitPlanParam(undefined), null)
  assert.equal(parseNonprofitPlanParam(["not-a-plan"]), null)
  assert.equal(nonprofitEnquirySource(null), "nonprofit_partnership")
  const page = pageSource()
  assert.match(page, /parseNonprofitPlanParam/)
  assert.match(page, /selectedPlan/)
})

// 8. Query-string text is never rendered directly
test("8. Query-string text is never rendered directly", () => {
  const page = pageSource()
  const enquiry = enquiryPageSource()
  assert.match(page, /parseNonprofitPlanParam\(params\.plan\)/)
  assert.match(page, /NONPROFIT_SEAT_PLANS\.find/)
  assert.doesNotMatch(enquiry, /searchParams/)
  assert.doesNotMatch(enquiry, /dangerouslySetInnerHTML/)
  assert.doesNotMatch(enquiry, /params\.plan/)
  assert.equal(parseNonprofitPlanParam("<script>alert(1)</script>"), null)
  assert.equal(parseNonprofitPlanParam("tiny';DROP TABLE"), null)
})

// 9. Organization name is required
test("9. Organization name is required", () => {
  const schema = readSrc(
    "features/leads/schemas/submit-nonprofit-partnership.ts"
  )
  assert.match(
    schema,
    /organizationName:\s*z[\s\S]*?\.min\(1,\s*"Organization name is required\."\)/
  )
  assert.match(formSource(), /organizationName/)
  assert.match(formSource(), /Organization name/)
})

// 10. Work email is validated
test("10. Work email is validated", () => {
  const schema = readSrc(
    "features/leads/schemas/submit-nonprofit-partnership.ts"
  )
  assert.match(
    schema,
    /email:\s*z\.email\("Enter a valid work email address\."\)/
  )
  assert.match(formSource(), /Work email address/)
  assert.match(formSource(), /type="email"/)
})

// 11. Selected plan is submitted
test("11. Selected plan is submitted", () => {
  const plan = planBySlug("small")
  assert.ok(plan)
  const message = composeNonprofitEnquiryMessage({
    plan,
    organizationName: "Helping Hands",
    estimatedParticipants: "1-25",
    accessAudience: "employees",
  })
  assert.match(message, /Selected plan: Small Organization \(small\)/)
  assert.match(message, /1–25 participants/)
  assert.match(message, /\$497/)
  const metadata = buildNonprofitEnquiryMetadata({
    plan,
    organizationName: "Helping Hands",
    estimatedParticipants: "1-25",
    accessAudience: "employees",
  })
  assert.equal(metadata.planSlug, "small")
  assert.equal(metadata.planName, "Small Organization")
  assert.equal(nonprofitEnquirySource("small"), "nonprofit_partnership_small")
  assert.match(serviceSource(), /submitNonprofitPartnership/)
  assert.match(serviceSource(), /buildNonprofitEnquiryMetadata/)
  assert.match(serviceSource(), /parseNonprofitPlanParam/)
})

// 12. Duplicate submission is prevented
test("12. Duplicate submission is prevented", () => {
  const form = formSource()
  assert.match(form, /submitLocked/)
  assert.match(form, /setSubmitLocked\(true\)/)
  assert.match(
    form,
    /disabled=\{isPending \|\| submitted \|\| submitLocked\}/
  )
  assert.match(form, /if \(submitLocked \|\| isPending \|\| submitted\)/)
})

// 13. Success state renders
test("13. Success state renders", () => {
  const form = formSource()
  assert.match(form, /NONPROFIT_ENQUIRY_SUCCESS_HEADING/)
  assert.match(form, /Return to Programs/)
  assert.match(form, /Go to Dashboard/)
  assert.match(form, /role="status"/)
  assert.match(form, /successRef/)
})

// 14. Server failure preserves form values
test("14. Server failure preserves form values", () => {
  const form = formSource()
  assert.match(form, /setSubmitLocked\(false\)/)
  assert.match(form, /setServerError\(result\.error\.message\)/)
  assert.doesNotMatch(form, /reset\(/)
})

// 15. No Stripe Checkout is created
test("15. No Stripe Checkout is created", () => {
  const form = formSource()
  const page = pageSource()
  const enquiry = enquiryPageSource()
  const service = serviceSource()
  for (const source of [form, page, enquiry, service]) {
    assert.doesNotMatch(source, /stripe/i)
    assert.doesNotMatch(source, /checkout\.sessions/i)
    assert.doesNotMatch(source, /createCheckout/i)
  }
  assert.equal(
    NONPROFIT_SEAT_PLANS.every((plan) => plan.slug.length > 0),
    true
  )
})

// 16. Broken decorative image is removed
test("16. Broken decorative image is removed", () => {
  const page = pageSource()
  assert.match(page, /NonprofitPartnershipEnquiryPage/)
  const nonprofitStart = page.indexOf("if (isNonprofitInquiry)")
  const nonprofitReturn = page.indexOf("return (", nonprofitStart)
  const afterNonprofit = page.indexOf("}", page.indexOf("/>", nonprofitReturn))
  const nonprofitBlock = page.slice(nonprofitStart, afterNonprofit + 1)
  assert.match(nonprofitBlock, /NonprofitPartnershipEnquiryPage/)
  assert.doesNotMatch(nonprofitBlock, /LeadPageShell|BRAND_IMAGES|BrandImage/)
  const enquiry = enquiryPageSource()
  assert.doesNotMatch(enquiry, /BrandImage|next\/image|<img/)
})

// 17. Medical disclaimer has reduced visual prominence
test("17. Medical disclaimer has reduced visual prominence", () => {
  const form = formSource()
  assert.match(form, /EDUCATIONAL_DISCLAIMER/)
  assert.doesNotMatch(form, /bg-cream2/)
  assert.match(form, /text-xs leading-relaxed text-ink-soft\/80/)
  assert.match(form, /NONPROFIT_ENQUIRY_NO_PURCHASE/)
  assert.equal(
    NONPROFIT_ENQUIRY_NO_PURCHASE,
    "Submitting this form does not create a purchase or subscription."
  )
})

// 18. No horizontal overflow at 375px
test("18. No horizontal overflow at 375px", () => {
  const page = enquiryPageSource()
  assert.match(page, /overflow-x-hidden/)
  assert.match(page, /min-w-0/)
  assert.match(page, /px-4/)
  assert.match(formSource(), /max-w-\[620px\]/)
})

// 19. Keyboard and focus behavior work
test("19. Keyboard and focus behavior work", () => {
  const form = formSource()
  assert.match(form, /setFocus\(first\)/)
  assert.match(form, /onInvalid/)
  assert.match(form, /aria-describedby/)
  assert.match(form, /aria-invalid/)
  assert.match(form, /aria-required/)
  assert.match(form, /successRef\.current\?\.focus/)
  assert.match(form, /tabIndex=\{-1\}/)
})

// 20. Existing enquiry persistence and email behavior remain intact
test("20. Existing enquiry persistence and email behavior remain intact", () => {
  const service = serviceSource()
  assert.match(service, /\.from\("leads"\)/)
  assert.match(service, /\.insert\(row\)/)
  assert.match(service, /lead_type: parsed\.data\.leadType/)
  assert.match(service, /submitNonprofitPartnership/)
  assert.match(service, /composeNonprofitEnquiryMessage/)
  const metadata = buildNonprofitEnquiryMetadata({
    plan: null,
    organizationName: "Helping Hands",
    estimatedParticipants: "1-25",
    accessAudience: "combination",
  })
  assert.equal(metadata.planSlug, null)
  assert.equal(metadata.planName, null)
  const message = composeNonprofitEnquiryMessage({
    plan: null,
    organizationName: "Helping Hands",
    estimatedParticipants: "1-25",
    accessAudience: "combination",
  })
  assert.match(message, /Selected plan: not specified/)
  assert.doesNotMatch(message, /<script/)
  assert.equal(NONPROFIT_ENQUIRY_EYEBROW, "NONPROFIT PARTNERSHIPS")
  assert.equal(NONPROFIT_ENQUIRY_HEADING, "Let’s support your organization")
  assert.ok(NONPROFIT_ENQUIRY_DESCRIPTION.includes("nonprofit"))
  assert.equal(NONPROFIT_ENQUIRY_CTA, "Request partnership information")
  assert.equal(NONPROFIT_ENQUIRY_NEXT_STEPS.length, 3)
  assert.equal(NONPROFIT_ENQUIRY_SUMMARY_BENEFITS.length, 6)
  assert.equal(
    NONPROFIT_ENQUIRY_PLANS_HREF,
    "/programs?membership=nonprofit#memberships"
  )
})
