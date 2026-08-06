import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

import {
  NONPROFIT_ENQUIRY_CTA,
  NONPROFIT_ENQUIRY_DESCRIPTION,
  NONPROFIT_ENQUIRY_EYEBROW,
  NONPROFIT_ENQUIRY_HEADING,
  NONPROFIT_ENQUIRY_NEXT_STEPS,
  NONPROFIT_ENQUIRY_NO_PURCHASE,
  NONPROFIT_ENQUIRY_SUMMARY_BENEFITS,
  NONPROFIT_PARTICIPANT_RANGE_OPTIONS,
  buildNonprofitEnquiryMetadata,
  composeNonprofitEnquiryMessage,
  nonprofitEnquirySource,
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

test("1. Common form collects participant estimate", () => {
  assert.ok(
    NONPROFIT_PARTICIPANT_RANGE_OPTIONS.some((option) => option.value === "1-25")
  )
  assert.ok(
    NONPROFIT_PARTICIPANT_RANGE_OPTIONS.some(
      (option) => option.value === "not-sure"
    )
  )
  assert.equal(
    NONPROFIT_PARTICIPANT_RANGE_OPTIONS.find(
      (option) => option.value === "not-sure"
    )?.label,
    "Not sure yet"
  )
  assert.match(formSource(), /estimatedParticipants/)
  assert.match(formSource(), /NONPROFIT_PARTICIPANT_RANGE_OPTIONS\.map/)
})

test("2. Form does not assign a public pricing plan", () => {
  const schema = readSrc(
    "features/leads/schemas/submit-nonprofit-partnership.ts"
  )
  assert.doesNotMatch(schema, /planSlug/)
  assert.doesNotMatch(formSource(), /planSlug/)
  assert.doesNotMatch(enquiryPageSource(), /SelectedPlanSummary|selectedPlan/)
  assert.doesNotMatch(pageSource(), /parseNonprofitPlanParam|selectedPlan/)
  const metadata = buildNonprofitEnquiryMetadata({
    organizationName: "Helping Hands",
    estimatedParticipants: "1-25",
    accessAudience: "employees",
  })
  assert.equal("planSlug" in metadata, false)
  assert.equal(nonprofitEnquirySource(), "nonprofit_partnership")
})

test("3. Partnership summary and four next steps render", () => {
  const page = enquiryPageSource()
  assert.match(page, /PartnershipSummary/)
  assert.equal(NONPROFIT_ENQUIRY_NEXT_STEPS.length, 4)
  assert.equal(
    NONPROFIT_ENQUIRY_NEXT_STEPS[2],
    "Terms, payment, and seat allowance are confirmed"
  )
  assert.equal(NONPROFIT_ENQUIRY_SUMMARY_BENEFITS.length, 6)
})

test("4. Organization name is required", () => {
  const schema = readSrc(
    "features/leads/schemas/submit-nonprofit-partnership.ts"
  )
  assert.match(
    schema,
    /organizationName:\s*z[\s\S]*?\.min\(1,\s*"Organization name is required\."\)/
  )
})

test("5. Work email is validated", () => {
  const schema = readSrc(
    "features/leads/schemas/submit-nonprofit-partnership.ts"
  )
  assert.match(
    schema,
    /email:\s*z\.email\("Enter a valid work email address\."\)/
  )
})

test("6. Duplicate submission is prevented", () => {
  const form = formSource()
  assert.match(form, /submitLocked/)
  assert.match(form, /setSubmitLocked\(true\)/)
})

test("7. Success state renders", () => {
  assert.match(formSource(), /EnquirySuccessPanel/)
  assert.match(formSource(), /NONPROFIT_ENQUIRY_SUCCESS_HEADING/)
})

test("8. No Stripe Checkout is created", () => {
  for (const source of [formSource(), pageSource(), enquiryPageSource(), serviceSource()]) {
    assert.doesNotMatch(source, /stripe/i)
    assert.doesNotMatch(source, /createCheckout/i)
  }
})

test("9. Enquiry message omits selected plan pricing", () => {
  const message = composeNonprofitEnquiryMessage({
    organizationName: "Helping Hands",
    estimatedParticipants: "1-25",
    accessAudience: "combination",
    partnershipNotes: "Prefer annual invoice",
  })
  assert.match(message, /Estimated participants: 1–25 participants/)
  assert.match(message, /Prefer annual invoice/)
  assert.doesNotMatch(message, /Selected plan:|\$497/)
})

test("10. Existing enquiry persistence remains intact", () => {
  const service = serviceSource()
  assert.match(service, /\.from\("leads"\)/)
  assert.match(service, /submitNonprofitPartnership/)
  assert.equal(NONPROFIT_ENQUIRY_EYEBROW, "NONPROFIT PARTNERSHIPS")
  assert.equal(NONPROFIT_ENQUIRY_HEADING, "Let’s support your organization")
  assert.ok(NONPROFIT_ENQUIRY_DESCRIPTION.includes("nonprofit"))
  assert.equal(NONPROFIT_ENQUIRY_CTA, "Request partnership information")
  assert.equal(
    NONPROFIT_ENQUIRY_NO_PURCHASE,
    "Submitting this form does not create a purchase or subscription."
  )
})
