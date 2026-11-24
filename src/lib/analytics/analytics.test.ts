import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

import { GTM_CONTAINER_ID } from "./constants.ts"
import { normalizeAnalyticsCurrency } from "./currency.ts"
import { isAnalyticsEligible } from "./eligibility.ts"
import {
  createMemoryPurchaseDedupeStore,
  shouldFirePurchaseEvent,
} from "./purchase-dedupe.ts"
import {
  analyticsEventHasPii,
  looksLikeEmail,
  sanitizeAnalyticsEvent,
} from "./sanitize.ts"
import type { AnalyticsEvent } from "./types.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..")

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8")
}

test("GTM container is inserted once at the app root without a separate GA4 snippet", () => {
  const layout = readSrc("src/app/layout.tsx")
  const gtm = readSrc("src/components/analytics/google-tag-manager.tsx")
  const constants = readSrc("src/lib/analytics/constants.ts")
  assert.match(constants, /GTM-54JKK6HG/)
  assert.equal(GTM_CONTAINER_ID, "GTM-54JKK6HG")
  assert.match(gtm, /GTM_CONTAINER_ID/)
  assert.match(layout, /GoogleTagManagerScript/)
  assert.match(layout, /GoogleTagManagerNoscript/)
  assert.doesNotMatch(layout, /gtag\(|googletagmanager\.com\/gtag/)
  assert.doesNotMatch(gtm, /gtag\(/)
})

test("signup and lead events fire only from success paths", () => {
  const signup = readSrc("src/features/auth/components/SignupForm.tsx")
  const leadForms = [
    readSrc("src/features/leads/components/LeadEnquiryForm.tsx"),
    readSrc("src/features/leads/components/LeadCaptureForm.tsx"),
    readSrc("src/features/leads/components/NonprofitPartnershipForm.tsx"),
  ]
  assert.match(signup, /isAnalyticsEligible\(result\)/)
  assert.match(signup, /trackSignup\(\)/)
  const signupCall = signup.indexOf("trackSignup()")
  const signupEligible = signup.indexOf("isAnalyticsEligible(result)")
  const signupFail = signup.indexOf("if (!result.success)")
  assert.ok(signupFail >= 0 && signupEligible > signupFail && signupCall > signupEligible)
  assert.match(signup.slice(signupFail, signupCall), /return/)
  for (const lead of leadForms) {
    assert.match(lead, /isAnalyticsEligible\(result\)/)
    assert.match(lead, /trackLead\(/)
    const leadCall = lead.indexOf("trackLead(")
    const leadEligible = lead.indexOf("isAnalyticsEligible(result)")
    const leadFail = lead.indexOf("if (!result.success)")
    assert.ok(leadFail >= 0 && leadEligible > leadFail && leadCall > leadEligible)
    assert.match(lead.slice(leadFail, leadCall), /return/)
  }
})

test("honeypot successes stay successful without analytics eligibility", () => {
  assert.equal(isAnalyticsEligible({ success: true, data: { analyticsEligible: false } }), false)
  assert.equal(isAnalyticsEligible({ success: true, data: { analyticsEligible: true } }), true)
  assert.equal(isAnalyticsEligible({ success: false }), false)

  const signup = readSrc("src/features/auth/services/auth.service.ts")
  const honeypot = signup.indexOf("Signup honeypot triggered")
  const accountCreate = signup.indexOf("supabase.auth.signUp")
  assert.ok(honeypot > 0 && accountCreate > honeypot)
  assert.match(signup.slice(honeypot, accountCreate), /analyticsEligible: false/)
  assert.doesNotMatch(signup.slice(honeypot, accountCreate), /supabase\.auth\.signUp/)
  assert.match(signup, /analyticsEligible: true/)

  const core = readSrc("src/features/leads/services/enquiry-submission.core.ts")
  const leadHoneypot = core.indexOf("isHoneypotTriggered(parsed.data")
  const insert = core.indexOf("await deps.insertLead")
  assert.ok(leadHoneypot > 0 && insert > leadHoneypot)
  assert.match(core.slice(leadHoneypot, insert), /analyticsEligible: false/)
  assert.doesNotMatch(core.slice(leadHoneypot, insert), /insertLead/)
  assert.match(core, /id: data\.id, analyticsEligible: true/)

  const nonprofit = readSrc("src/features/leads/services/leads.service.ts")
  const nonprofitHoneypot = nonprofit.indexOf("Nonprofit enquiry honeypot triggered")
  const nonprofitPersist = nonprofit.indexOf("return submitLead(")
  assert.ok(nonprofitHoneypot > 0 && nonprofitPersist > nonprofitHoneypot)
  assert.match(nonprofit.slice(nonprofitHoneypot, nonprofitPersist), /return honeypotSuccess\(\)/)
  assert.match(nonprofit, /analyticsEligible: false/)
})

test("begin_checkout fires after session creation and purchase requires fulfilled paid state", () => {
  const consent = readSrc("src/features/checkout/components/checkout-consent-form.tsx")
  const actions = readSrc("src/features/checkout/actions/checkout.actions.ts")
  const success = readSrc("src/features/checkout/components/checkout-success-status.tsx")
  const successService = readSrc("src/features/checkout/services/checkout-success.service.ts")
  assert.match(actions, /createCheckoutSession/)
  assert.doesNotMatch(actions, /redirect\(/)
  assert.match(consent, /redirectToCheckout/)
  assert.match(success, /trackPurchaseOnce/)
  assert.match(success, /transactionId: analytics.transactionId/)
  assert.match(success, /state !== "fulfilled"/)
  assert.match(successService, /accessReady/)
  assert.match(successService, /transactionId: session.id/)
  assert.match(successService, /purchaseAnalytics: accessReady/)
  const successPage = readSrc("src/app/(public)/checkout/success/page.tsx")
  assert.doesNotMatch(successPage, /trackPurchase/)
})

test("sanitizeAnalyticsEvent strips PII keys and email-like strings", () => {
  const dirty = {
    event: "lead",
    lead_type: "retreat",
    source: "retreats_page",
    email: "person@example.com",
    phone: "555-0100",
    message: "hello",
  } as unknown as AnalyticsEvent
  const clean = sanitizeAnalyticsEvent(dirty)
  assert.equal(analyticsEventHasPii(clean), false)
  assert.equal("email" in clean, false)
  assert.equal("phone" in clean, false)
  assert.equal("message" in clean, false)
  assert.equal(looksLikeEmail("person@example.com"), true)
})

test("typed analytics helpers never include email or health fields", () => {
  const events: AnalyticsEvent[] = [
    { event: "signup" },
    { event: "lead", lead_type: "retreat", source: "retreats_page" },
    {
      event: "begin_checkout",
      value: 47,
      currency: "usd",
      items: [{ item_id: "plan-1", item_name: "Elevate Core" }],
    },
    {
      event: "purchase",
      transaction_id: "cs_test_123",
      value: 47,
      currency: "usd",
      items: [{ item_id: "autoimmune-masterclass" }],
    },
  ]
  for (const event of events) {
    const clean = sanitizeAnalyticsEvent(event)
    assert.equal(analyticsEventHasPii(clean), false)
    assert.equal("email" in clean, false)
    assert.equal("phone" in clean, false)
    assert.equal("message" in clean, false)
    assert.equal("health" in clean, false)
  }
})

test("reset landing page pushes a PII-free view_item event for the reset product", () => {
  const page = readSrc("src/app/(public)/reset/page.tsx")
  const tracker = readSrc("src/components/analytics/view-item-tracker.tsx")
  const dataLayer = readSrc("src/lib/analytics/data-layer.ts")
  assert.match(page, /<ViewItemTracker itemId=\{RESET_PLAN\.slug\}/)
  assert.match(tracker, /trackViewItem\(/)
  assert.match(dataLayer, /event: "view_item"/)

  const clean = sanitizeAnalyticsEvent({
    event: "view_item",
    items: [{ item_id: "7-day-reset", item_name: "Reset Plan" }],
  })
  assert.equal(analyticsEventHasPii(clean), false)
  assert.deepEqual(clean, {
    event: "view_item",
    items: [{ item_id: "7-day-reset", item_name: "Reset Plan" }],
  })
})

test("begin_checkout and purchase send uppercase ISO currency", () => {
  assert.equal(normalizeAnalyticsCurrency("usd"), "USD")
  assert.equal(normalizeAnalyticsCurrency(" gbp "), "GBP")
  assert.equal(normalizeAnalyticsCurrency("  "), undefined)
  const dataLayer = readSrc("src/lib/analytics/data-layer.ts")
  assert.match(dataLayer, /normalizeAnalyticsCurrency\(input\.currency\)/)
  assert.doesNotMatch(dataLayer, /toLowerCase\(\)/)
})

test("purchase transaction_id is the checkout session id and survives sanitizing", () => {
  const event: AnalyticsEvent = {
    event: "purchase",
    transaction_id: "cs_live_session_1",
    value: 47,
    currency: "usd",
    items: [{ item_id: "plan-core", item_name: "Elevate Core" }],
  }
  const clean = sanitizeAnalyticsEvent(event)
  assert.equal(clean.event, "purchase")
  if (clean.event !== "purchase") {
    return
  }
  assert.equal(clean.transaction_id, "cs_live_session_1")
  assert.equal(analyticsEventHasPii(clean), false)
  const dataLayer = readSrc("src/lib/analytics/data-layer.ts")
  const client = readSrc("src/lib/analytics/client.ts")
  assert.match(dataLayer, /transaction_id: input.transactionId/)
  assert.match(client, /createSessionPurchaseDedupeStore/)
  assert.match(client, /pushPurchase\(input\)/)
})

test("purchase events dedupe by transaction id", () => {
  const store = createMemoryPurchaseDedupeStore()
  assert.equal(shouldFirePurchaseEvent(store, "cs_live_1"), true)
  assert.equal(shouldFirePurchaseEvent(store, "cs_live_1"), false)
  assert.equal(shouldFirePurchaseEvent(store, "cs_live_2"), true)
  assert.equal(shouldFirePurchaseEvent(store, "  "), false)
})

test("pushAnalyticsEvent uses the shared dataLayer helper rather than scattered window writes", () => {
  const dataLayer = readSrc("src/lib/analytics/data-layer.ts")
  const client = readSrc("src/lib/analytics/client.ts")
  assert.match(dataLayer, /dataLayer/)
  assert.match(client, /from "\.\/data-layer"/)
  assert.doesNotMatch(client, /window\.dataLayer\.push/)
})
