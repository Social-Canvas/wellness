/**
 * Pure Sales & Membership Overview helpers.
 * Type-only sibling imports are erased at runtime so Node unit tests can load
 * this module directly. No exceljs / path-alias runtime deps.
 */

import type {
  MarketingConsentExportRow,
  MembershipTierBreakdownRow,
  ProductPurchaseBreakdownRow,
  RecentSaleRow,
  SalesDateRange,
  SalesDateRangePreset,
  SalesMetricCard,
  SalesOverviewSnapshot,
} from "./sales-overview-types"

export type {
  MarketingConsentExportRow,
  MembershipTierBreakdownRow,
  ProductPurchaseBreakdownRow,
  RecentSaleRow,
  SalesDateRange,
  SalesDateRangePreset,
  SalesMetricCard,
  SalesOverviewSnapshot,
} from "./sales-overview-types"

// ---------------------------------------------------------------------------
// Test-data exclusion (exact rules — no broad heuristics)
// ---------------------------------------------------------------------------

/** Mirrors scripts/complimentary-access.mjs marker prefix. */
export const COMP_PREVIEW_MARKER_PREFIX = "comp_launch_testing_"

export const EXCLUDED_TEST_EMAIL_DOMAINS = ["example.com"] as const

export const EXCLUDED_TEST_EMAILS = [
  "e2e@elevate-healthsolutions.com",
  "smoke@elevate-healthsolutions.com",
  "playwright@elevate-healthsolutions.com",
] as const

export const TEST_DATA_EXCLUSION_SUMMARY =
  "Excludes: emails ending in @example.com; exact E2E/smoke emails " +
  "(e2e@, smoke@, playwright@ elevate-healthsolutions.com); admin/super_admin " +
  "profiles from customer counts; Stripe test-mode checkout sessions (cs_test_*); " +
  "complimentary launch-testing subscriptions (comp_launch_testing_* / access_source=complimentary); " +
  "free_claim product entitlements (never create paid orders)."

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isExcludedTestEmail(email: string): boolean {
  const normalized = normalizeEmail(email)
  if (!normalized.includes("@")) {
    return false
  }

  const domain = normalized.slice(normalized.lastIndexOf("@") + 1)
  if ((EXCLUDED_TEST_EMAIL_DOMAINS as readonly string[]).includes(domain)) {
    return true
  }

  return (EXCLUDED_TEST_EMAILS as readonly string[]).includes(normalized)
}

export function isStripeTestCheckoutSessionId(
  sessionId: string | null | undefined
): boolean {
  return typeof sessionId === "string" && sessionId.startsWith("cs_test_")
}

export function isComplimentarySubscriptionId(
  subscriptionId: string | null | undefined
): boolean {
  return (
    typeof subscriptionId === "string" &&
    subscriptionId.startsWith(COMP_PREVIEW_MARKER_PREFIX)
  )
}

export function isExcludedAdminRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "super_admin"
}

export function isExcludedComplimentaryAccessSource(
  accessSource: string | null | undefined
): boolean {
  return accessSource === "complimentary"
}

/** Mirrors preview-eligibility isActiveSubscription for paid membership counting. */
function isActiveSubscriptionStatus(
  subscription: {
    status: string
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
  },
  nowMs: number
): boolean {
  const periodEnd = subscription.currentPeriodEnd
    ? Date.parse(subscription.currentPeriodEnd)
    : null
  const hasValidPeriodEnd =
    periodEnd !== null && !Number.isNaN(periodEnd) && periodEnd > nowMs

  if (periodEnd !== null && !Number.isNaN(periodEnd) && periodEnd <= nowMs) {
    return false
  }

  if (subscription.status === "active" || subscription.status === "trialing") {
    return true
  }

  if (subscription.cancelAtPeriodEnd && hasValidPeriodEnd) {
    return true
  }

  return false
}

// ---------------------------------------------------------------------------
// Money + date range
// ---------------------------------------------------------------------------

export function formatCents(
  cents: number | null | undefined,
  currency: string = "usd"
): string {
  if (cents === null || cents === undefined) {
    return "—"
  }

  const code = currency.trim().toUpperCase() || "USD"
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
    }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${code}`
  }
}

export function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-US").format(value)
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function parseYmdToUtcStart(ymd: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

export function resolveSalesDateRange(input: {
  preset: SalesDateRangePreset
  from?: string
  to?: string
  now?: Date
}): SalesDateRange {
  const now = input.now ?? new Date()
  const todayStart = startOfUtcDay(now)

  switch (input.preset) {
    case "today":
      return {
        preset: "today",
        start: todayStart,
        end: addUtcDays(todayStart, 1),
        label: "Today",
      }
    case "7d":
      return {
        preset: "7d",
        start: addUtcDays(todayStart, -6),
        end: addUtcDays(todayStart, 1),
        label: "Last 7 days",
      }
    case "30d":
      return {
        preset: "30d",
        start: addUtcDays(todayStart, -29),
        end: addUtcDays(todayStart, 1),
        label: "Last 30 days",
      }
    case "month": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
      return {
        preset: "month",
        start,
        end,
        label: "This month",
      }
    }
    case "custom": {
      const start = input.from ? parseYmdToUtcStart(input.from) : null
      const endInclusive = input.to ? parseYmdToUtcStart(input.to) : null
      if (!start || !endInclusive) {
        return {
          preset: "all",
          start: null,
          end: null,
          label: "All time",
        }
      }
      const end = addUtcDays(endInclusive, 1)
      if (start.getTime() >= end.getTime()) {
        return {
          preset: "all",
          start: null,
          end: null,
          label: "All time",
        }
      }
      return {
        preset: "custom",
        start,
        end,
        label: `Custom (${input.from} → ${input.to})`,
      }
    }
    case "all":
    default:
      return {
        preset: "all",
        start: null,
        end: null,
        label: "All time",
      }
  }
}

export function isTimestampInRange(
  iso: string | null | undefined,
  range: SalesDateRange
): boolean {
  if (!iso) {
    return false
  }

  if (range.start === null && range.end === null) {
    return true
  }

  const time = Date.parse(iso)
  if (Number.isNaN(time)) {
    return false
  }

  if (range.start !== null && time < range.start.getTime()) {
    return false
  }

  if (range.end !== null && time >= range.end.getTime()) {
    return false
  }

  return true
}

export function dateRangeToSearchParams(range: {
  preset: SalesDateRangePreset
  from?: string
  to?: string
}): URLSearchParams {
  const params = new URLSearchParams()
  if (range.preset !== "all") {
    params.set("range", range.preset)
  }
  if (range.preset === "custom") {
    if (range.from) {
      params.set("from", range.from)
    }
    if (range.to) {
      params.set("to", range.to)
    }
  }
  return params
}

// ---------------------------------------------------------------------------
// Snapshot builder
// ---------------------------------------------------------------------------

export type OverviewProfileInput = {
  id: string
  email: string
  role: string
  fullName: string | null
  createdAt: string
}

export type OverviewOrderItemInput = {
  productId: string
  productName: string
  quantity: number
  unitAmountCents: number
  currency: string
}

export type OverviewOrderInput = {
  id: string
  userId: string
  status: string
  amountPaidCents: number
  currency: string
  purchasedAt: string | null
  createdAt: string
  stripeCheckoutSessionId: string | null
  customerEmail: string
  customerName: string | null
  customerRole: string
  items: OverviewOrderItemInput[]
}

export type OverviewSubscriptionInput = {
  id: string
  userId: string
  status: string
  planId: string
  planName: string
  planSlug: string
  stripeSubscriptionId: string
  accessSource: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  createdAt: string
  customerEmail: string
  customerName: string | null
  customerRole: string
}

export type OverviewSponsoredMemberInput = {
  id: string
  userId: string | null
  email: string
  status: string
  planName: string | null
  planSlug: string | null
  activatedAt: string | null
  customerName: string | null
  customerRole: string | null
}

export type OverviewMarketingConsentInput = {
  email: string
  status: string
  source: string
  consentedAt: string
}

export type BuildOverviewInput = {
  dateRange: SalesDateRange
  generatedAt?: string
  now?: Date
  profiles: OverviewProfileInput[]
  orders: OverviewOrderInput[]
  subscriptions: OverviewSubscriptionInput[]
  sponsoredMembers: OverviewSponsoredMemberInput[]
  marketingConsents: OverviewMarketingConsentInput[]
  recentLimit?: number
}

function isRealCustomerProfile(profile: {
  email: string
  role: string
}): boolean {
  return !isExcludedAdminRole(profile.role) && !isExcludedTestEmail(profile.email)
}

function isEligiblePaidOrder(order: OverviewOrderInput): boolean {
  if (order.status !== "paid") {
    return false
  }
  if (order.amountPaidCents <= 0) {
    return false
  }
  if (isStripeTestCheckoutSessionId(order.stripeCheckoutSessionId)) {
    return false
  }
  if (!isRealCustomerProfile({ email: order.customerEmail, role: order.customerRole })) {
    return false
  }
  return true
}

function isEligibleActiveMembership(
  subscription: OverviewSubscriptionInput,
  nowMs: number
): boolean {
  if (
    !isRealCustomerProfile({
      email: subscription.customerEmail,
      role: subscription.customerRole,
    })
  ) {
    return false
  }
  if (isComplimentarySubscriptionId(subscription.stripeSubscriptionId)) {
    return false
  }
  if (isExcludedComplimentaryAccessSource(subscription.accessSource)) {
    return false
  }
  return isActiveSubscriptionStatus(
    {
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    },
    nowMs
  )
}

function isEligibleSponsoredMember(member: OverviewSponsoredMemberInput): boolean {
  if (member.status !== "active") {
    return false
  }
  if (isExcludedTestEmail(member.email)) {
    return false
  }
  if (member.customerRole && isExcludedAdminRole(member.customerRole)) {
    return false
  }
  return true
}

function tierLabelFromPlan(planName: string, planSlug: string): {
  key: string
  label: string
} {
  const haystack = `${planName} ${planSlug}`.toLowerCase()
  if (haystack.includes("platinum") || planSlug === "plan-3") {
    return { key: "platinum", label: "Elevate Platinum" }
  }
  if (haystack.includes("gold") || planSlug === "plan-2") {
    return { key: "gold", label: "Elevate Gold" }
  }
  if (haystack.includes("core") || planSlug === "plan-1") {
    return { key: "core", label: "Elevate Core" }
  }
  return {
    key: planSlug || "other",
    label: planName || "Other plan",
  }
}

export function buildSalesOverviewSnapshot(
  input: BuildOverviewInput
): SalesOverviewSnapshot {
  const now = input.now ?? new Date()
  const nowMs = now.getTime()
  const generatedAt = input.generatedAt ?? now.toISOString()
  const recentLimit = input.recentLimit ?? 25
  const range = input.dateRange

  const eligibleProfiles = input.profiles.filter(isRealCustomerProfile)
  const customersInRange = eligibleProfiles.filter((profile) =>
    isTimestampInRange(profile.createdAt, range)
  )

  const eligibleOrders = input.orders.filter(isEligiblePaidOrder)
  const ordersInRange = eligibleOrders.filter((order) =>
    isTimestampInRange(order.purchasedAt ?? order.createdAt, range)
  )

  const activeMemberships = input.subscriptions.filter((subscription) =>
    isEligibleActiveMembership(subscription, nowMs)
  )
  const activeSponsored = input.sponsoredMembers.filter(isEligibleSponsoredMember)

  const revenueCents = ordersInRange.reduce(
    (sum, order) => sum + order.amountPaidCents,
    0
  )
  const primaryCurrency =
    ordersInRange.find((order) => order.currency)?.currency ?? "usd"

  const metrics: SalesMetricCard[] = [
    {
      id: "total_customers",
      label: "Total customers",
      value: customersInRange.length,
      displayValue: formatInteger(customersInRange.length),
      tooltip:
        "Unique real customer accounts (role = user). Excludes admins and test emails. Filtered by account created date when a date range is selected.",
      reliability: "authoritative",
      note: null,
      dateFilterApplies: true,
    },
    {
      id: "one_time_purchases",
      label: "One-time purchases",
      value: ordersInRange.length,
      displayValue: formatInteger(ordersInRange.length),
      tooltip:
        "Successfully paid one-time product/course checkouts. Free claims never create paid orders and are excluded. Filtered by purchase date.",
      reliability: "authoritative",
      note: null,
      dateFilterApplies: true,
    },
    {
      id: "active_memberships",
      label: "Active memberships",
      value: activeMemberships.length + activeSponsored.length,
      displayValue: formatInteger(
        activeMemberships.length + activeSponsored.length
      ),
      tooltip:
        "Currently active paid personal subscriptions plus active sponsored seats. Cancelled/expired and complimentary tester grants are excluded. Always current state — not a historical date-range metric.",
      reliability: "authoritative",
      note: "Current state (not filtered by date range)",
      dateFilterApplies: false,
    },
    {
      id: "successful_payments",
      label: "Successful payments",
      value: ordersInRange.length,
      displayValue: formatInteger(ordersInRange.length),
      tooltip:
        "Successful monetary one-time checkout payments synced from Stripe. Membership renewals are not stored as local payment rows, so recurring charges are not included here.",
      reliability: "partial",
      note: "One-time checkouts only — renewals not in local DB",
      dateFilterApplies: true,
    },
    {
      id: "revenue_collected",
      label: "Revenue collected",
      value: revenueCents,
      displayValue: formatCents(revenueCents, primaryCurrency),
      tooltip:
        "Sum of amount_paid on Stripe-synced paid one-time orders (actual captured checkout totals). Not plan price × count. Membership subscription/renewal revenue is not persisted locally.",
      reliability: "partial",
      note: "Product checkouts only — membership renewals available in Stripe",
      dateFilterApplies: true,
    },
  ]

  const productMap = new Map<string, ProductPurchaseBreakdownRow>()
  for (const order of ordersInRange) {
    if (order.items.length === 0) {
      const key = `order:${order.id}`
      const existing = productMap.get(key)
      if (existing) {
        existing.purchaseCount += 1
        existing.revenueCents += order.amountPaidCents
      } else {
        productMap.set(key, {
          productId: key,
          productName: "Unknown product",
          purchaseCount: 1,
          revenueCents: order.amountPaidCents,
          currency: order.currency,
        })
      }
      continue
    }

    for (const item of order.items) {
      const existing = productMap.get(item.productId)
      const lineRevenue =
        order.items.length === 1
          ? order.amountPaidCents
          : item.unitAmountCents * item.quantity
      if (existing) {
        existing.purchaseCount += item.quantity
        existing.revenueCents += lineRevenue
      } else {
        productMap.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          purchaseCount: item.quantity,
          revenueCents: lineRevenue,
          currency: item.currency || order.currency,
        })
      }
    }
  }

  const purchasesByProduct = [...productMap.values()].sort(
    (a, b) => b.revenueCents - a.revenueCents || b.purchaseCount - a.purchaseCount
  )

  const tierMap = new Map<string, MembershipTierBreakdownRow>()
  for (const subscription of activeMemberships) {
    const tier = tierLabelFromPlan(subscription.planName, subscription.planSlug)
    const existing = tierMap.get(tier.key)
    if (existing) {
      existing.activeCount += 1
      if (existing.source !== "personal_stripe") {
        existing.source = "mixed"
      }
    } else {
      tierMap.set(tier.key, {
        tierKey: tier.key,
        tierLabel: tier.label,
        activeCount: 1,
        source: "personal_stripe",
      })
    }
  }

  for (const member of activeSponsored) {
    const planName = member.planName ?? "Elevate Platinum"
    const planSlug = member.planSlug ?? "plan-3"
    const tier = tierLabelFromPlan(planName, planSlug)
    const key = `sponsored:${tier.key}`
    const label = `${tier.label} (sponsored)`
    const existing = tierMap.get(key)
    if (existing) {
      existing.activeCount += 1
    } else {
      tierMap.set(key, {
        tierKey: key,
        tierLabel: label,
        activeCount: 1,
        source: "sponsored",
      })
    }
  }

  const membershipsByTier = [...tierMap.values()].sort(
    (a, b) => b.activeCount - a.activeCount || a.tierLabel.localeCompare(b.tierLabel)
  )

  const recentOneTime: RecentSaleRow[] = ordersInRange.map((order) => {
    const productName =
      order.items.map((item) => item.productName).filter(Boolean).join(", ") ||
      "One-time purchase"
    return {
      id: `order:${order.id}`,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      productOrPlan: productName,
      type: "one_time",
      amountCents: order.amountPaidCents,
      currency: order.currency,
      occurredAt: order.purchasedAt ?? order.createdAt,
      status: order.status,
    }
  })

  const recentMembershipStarts: RecentSaleRow[] = activeMemberships
    .filter((subscription) => isTimestampInRange(subscription.createdAt, range))
    .map((subscription) => ({
      id: `sub:${subscription.id}`,
      customerName: subscription.customerName,
      customerEmail: subscription.customerEmail,
      productOrPlan: subscription.planName,
      type: "membership" as const,
      amountCents: null,
      currency: null,
      occurredAt: subscription.createdAt,
      status: subscription.status,
    }))

  const recentSales = [...recentOneTime, ...recentMembershipStarts]
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
    .slice(0, recentLimit)

  const marketingConsents: MarketingConsentExportRow[] = input.marketingConsents
    .filter((row) => !isExcludedTestEmail(row.email))
    .filter((row) => isTimestampInRange(row.consentedAt, range))
    .map((row) => ({
      email: row.email,
      status: row.status,
      source: row.source,
      consentedAt: row.consentedAt,
    }))
    .sort((a, b) => Date.parse(b.consentedAt) - Date.parse(a.consentedAt))

  const limitations = [
    "Membership renewal / invoice payment amounts are not stored locally. Stripe remains the source of truth for recurring revenue.",
    "Successful payments and revenue collected cover Stripe-synced paid one-time product checkouts only.",
    "Active memberships reflect current subscription and sponsored seat state and are not historically reconstructed for date ranges.",
    "Free claims create product_entitlements rows only and never appear as paid purchases.",
  ]

  return {
    generatedAt,
    dateRange: range,
    metrics,
    purchasesByProduct,
    membershipsByTier,
    recentSales,
    marketingConsents,
    limitations,
    exclusionSummary: TEST_DATA_EXCLUSION_SUMMARY,
  }
}

export const SALES_EXPORT_FORBIDDEN_SUBSTRINGS = [
  "stripe_payment_intent",
  "stripe_checkout_session",
  "stripe_customer",
  "stripe_subscription",
  "webhook",
  "payload",
  "secret",
  "token",
  "payment_method",
  "card_number",
  "client_secret",
] as const

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function csvRow(cells: Array<string | number | null | undefined>): string {
  return cells
    .map((cell) => {
      if (cell === null || cell === undefined) {
        return ""
      }
      return csvEscape(String(cell))
    })
    .join(",")
}

export function buildSalesOverviewCsv(snapshot: SalesOverviewSnapshot): string {
  const lines: string[] = []

  lines.push("SECTION,SUMMARY")
  lines.push(csvRow(["Metric", "Value", "Note", "Date filter applies"]))
  for (const metric of snapshot.metrics) {
    lines.push(
      csvRow([
        metric.label,
        metric.displayValue,
        metric.note ?? "",
        metric.dateFilterApplies ? "yes" : "no (current state)",
      ])
    )
  }
  lines.push(csvRow(["Date range", snapshot.dateRange.label, "", ""]))
  lines.push(csvRow(["Generated at", snapshot.generatedAt, "", ""]))
  lines.push("")

  lines.push("SECTION,TRANSACTIONS")
  lines.push(
    csvRow([
      "Customer name",
      "Customer email",
      "Product or plan",
      "Type",
      "Amount",
      "Currency",
      "Date",
      "Status",
    ])
  )
  for (const row of snapshot.recentSales) {
    lines.push(
      csvRow([
        row.customerName ?? "",
        row.customerEmail,
        row.productOrPlan,
        row.type === "one_time" ? "One-time purchase" : "Membership",
        row.amountCents === null
          ? "See Stripe for membership renewals"
          : formatCents(row.amountCents, row.currency ?? "usd"),
        row.currency?.toUpperCase() ?? "",
        row.occurredAt,
        row.status,
      ])
    )
  }
  lines.push("")

  lines.push("SECTION,PURCHASES BY PRODUCT")
  lines.push(csvRow(["Product name", "Purchase count", "Revenue", "Currency"]))
  for (const row of snapshot.purchasesByProduct) {
    lines.push(
      csvRow([
        row.productName,
        row.purchaseCount,
        formatCents(row.revenueCents, row.currency),
        row.currency.toUpperCase(),
      ])
    )
  }
  lines.push("")

  lines.push("SECTION,MEMBERSHIPS BY TIER")
  lines.push(csvRow(["Tier", "Active count", "Source"]))
  for (const row of snapshot.membershipsByTier) {
    lines.push(
      csvRow([
        row.tierLabel,
        row.activeCount,
        row.source === "sponsored"
          ? "Sponsored"
          : row.source === "mixed"
            ? "Mixed"
            : "Personal membership",
      ])
    )
  }
  lines.push("")

  lines.push("SECTION,MARKETING CONSENT")
  lines.push(csvRow(["Email", "Status", "Source", "Consented at"]))
  for (const row of snapshot.marketingConsents) {
    lines.push(csvRow([row.email, row.status, row.source, row.consentedAt]))
  }
  lines.push("")

  lines.push("SECTION,LIMITATIONS")
  for (const limitation of snapshot.limitations) {
    lines.push(csvRow([limitation]))
  }
  lines.push(csvRow([snapshot.exclusionSummary]))

  return `\uFEFF${lines.join("\n")}`
}
