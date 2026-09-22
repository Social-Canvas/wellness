import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"

import {
  buildSalesOverviewCsv,
  buildSalesOverviewSnapshot,
  isExcludedTestEmail,
  isStripeTestCheckoutSessionId,
  resolveSalesDateRange,
  SALES_EXPORT_FORBIDDEN_SUBSTRINGS,
  TEST_DATA_EXCLUSION_SUMMARY,
  COMP_PREVIEW_MARKER_PREFIX,
  type OverviewOrderInput,
  type OverviewProfileInput,
  type OverviewSponsoredMemberInput,
  type OverviewSubscriptionInput,
} from "./utils/sales-overview-core.ts"
import { buildSalesOverviewXlsx } from "./utils/export-xlsx.ts"

const NOW = new Date("2026-09-22T12:00:00.000Z")

function profile(
  overrides: Partial<OverviewProfileInput> & Pick<OverviewProfileInput, "id" | "email">
): OverviewProfileInput {
  return {
    role: "user",
    fullName: "Customer",
    createdAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  }
}

function order(
  overrides: Partial<OverviewOrderInput> & Pick<OverviewOrderInput, "id" | "customerEmail">
): OverviewOrderInput {
  return {
    userId: "user-1",
    status: "paid",
    amountPaidCents: 9900,
    currency: "usd",
    purchasedAt: "2026-09-20T10:00:00.000Z",
    createdAt: "2026-09-20T10:00:00.000Z",
    stripeCheckoutSessionId: "cs_live_abc",
    customerName: "Ada",
    customerRole: "user",
    items: [
      {
        productId: "prod-reset",
        productName: "Reset Plan",
        quantity: 1,
        unitAmountCents: 9900,
        currency: "usd",
      },
    ],
    ...overrides,
  }
}

function subscription(
  overrides: Partial<OverviewSubscriptionInput> &
    Pick<OverviewSubscriptionInput, "id" | "customerEmail">
): OverviewSubscriptionInput {
  return {
    userId: "user-1",
    status: "active",
    planId: "plan-gold",
    planName: "Elevate Gold",
    planSlug: "plan-2",
    stripeSubscriptionId: "sub_live_abc",
    accessSource: "personal_stripe",
    currentPeriodEnd: "2026-10-22T00:00:00.000Z",
    cancelAtPeriodEnd: false,
    createdAt: "2026-09-10T00:00:00.000Z",
    customerName: "Ada",
    customerRole: "user",
    ...overrides,
  }
}

function metricValue(
  snapshot: ReturnType<typeof buildSalesOverviewSnapshot>,
  id: string
): number | null {
  return snapshot.metrics.find((metric) => metric.id === id)?.value ?? null
}

test("excludes @example.com and exact E2E emails", () => {
  assert.equal(isExcludedTestEmail("person@example.com"), true)
  assert.equal(isExcludedTestEmail("e2e@elevate-healthsolutions.com"), true)
  assert.equal(isExcludedTestEmail("smoke@elevate-healthsolutions.com"), true)
  assert.equal(isExcludedTestEmail("real.customer@gmail.com"), false)
})

test("detects Stripe test-mode checkout sessions", () => {
  assert.equal(isStripeTestCheckoutSessionId("cs_test_123"), true)
  assert.equal(isStripeTestCheckoutSessionId("cs_live_123"), false)
})

test("free claims never inflate one-time purchases (no paid order rows)", () => {
  const snapshot = buildSalesOverviewSnapshot({
    now: NOW,
    dateRange: resolveSalesDateRange({ preset: "all", now: NOW }),
    profiles: [profile({ id: "p1", email: "real@customer.com" })],
    orders: [],
    subscriptions: [],
    sponsoredMembers: [],
    marketingConsents: [],
  })

  assert.equal(metricValue(snapshot, "one_time_purchases"), 0)
  assert.equal(metricValue(snapshot, "revenue_collected"), 0)
})

test("zero-amount paid rows are excluded from monetary metrics", () => {
  const snapshot = buildSalesOverviewSnapshot({
    now: NOW,
    dateRange: resolveSalesDateRange({ preset: "all", now: NOW }),
    profiles: [profile({ id: "p1", email: "real@customer.com" })],
    orders: [
      order({
        id: "o-zero",
        customerEmail: "real@customer.com",
        amountPaidCents: 0,
      }),
    ],
    subscriptions: [],
    sponsoredMembers: [],
    marketingConsents: [],
  })

  assert.equal(metricValue(snapshot, "one_time_purchases"), 0)
  assert.equal(metricValue(snapshot, "successful_payments"), 0)
  assert.equal(metricValue(snapshot, "revenue_collected"), 0)
})

test("cancelled and complimentary memberships are excluded from active count", () => {
  const snapshot = buildSalesOverviewSnapshot({
    now: NOW,
    dateRange: resolveSalesDateRange({ preset: "all", now: NOW }),
    profiles: [
      profile({ id: "p1", email: "active@customer.com" }),
      profile({ id: "p2", email: "canceled@customer.com" }),
      profile({ id: "p3", email: "comp@customer.com" }),
    ],
    orders: [],
    subscriptions: [
      subscription({
        id: "s1",
        customerEmail: "active@customer.com",
        status: "active",
      }),
      subscription({
        id: "s2",
        customerEmail: "canceled@customer.com",
        status: "canceled",
        currentPeriodEnd: "2026-08-01T00:00:00.000Z",
      }),
      subscription({
        id: "s3",
        customerEmail: "comp@customer.com",
        stripeSubscriptionId: `${COMP_PREVIEW_MARKER_PREFIX}p3`,
        accessSource: "complimentary",
      }),
    ],
    sponsoredMembers: [],
    marketingConsents: [],
  })

  assert.equal(metricValue(snapshot, "active_memberships"), 1)
})

test("successful payments count one-time checkouts only (renewals not in local DB)", () => {
  const snapshot = buildSalesOverviewSnapshot({
    now: NOW,
    dateRange: resolveSalesDateRange({ preset: "all", now: NOW }),
    profiles: [profile({ id: "p1", email: "real@customer.com" })],
    orders: [
      order({ id: "o1", customerEmail: "real@customer.com", amountPaidCents: 4700 }),
      order({ id: "o2", customerEmail: "real@customer.com", amountPaidCents: 9900 }),
    ],
    subscriptions: [
      subscription({ id: "s1", customerEmail: "real@customer.com" }),
    ],
    sponsoredMembers: [],
    marketingConsents: [],
  })

  assert.equal(metricValue(snapshot, "successful_payments"), 2)
  assert.equal(metricValue(snapshot, "revenue_collected"), 14600)
  const paymentsMetric = snapshot.metrics.find((m) => m.id === "successful_payments")
  assert.equal(paymentsMetric?.reliability, "partial")
  assert.match(paymentsMetric?.note ?? "", /renewals/i)
})

test("test-mode checkout sessions are excluded from production metrics", () => {
  const snapshot = buildSalesOverviewSnapshot({
    now: NOW,
    dateRange: resolveSalesDateRange({ preset: "all", now: NOW }),
    profiles: [
      profile({ id: "p1", email: "real@customer.com" }),
      profile({ id: "p2", email: "tester@example.com" }),
    ],
    orders: [
      order({
        id: "o-live",
        customerEmail: "real@customer.com",
        stripeCheckoutSessionId: "cs_live_ok",
        amountPaidCents: 5000,
      }),
      order({
        id: "o-test",
        customerEmail: "real@customer.com",
        stripeCheckoutSessionId: "cs_test_bad",
        amountPaidCents: 5000,
      }),
      order({
        id: "o-example",
        customerEmail: "tester@example.com",
        amountPaidCents: 5000,
      }),
    ],
    subscriptions: [],
    sponsoredMembers: [],
    marketingConsents: [],
  })

  assert.equal(metricValue(snapshot, "one_time_purchases"), 1)
  assert.equal(metricValue(snapshot, "revenue_collected"), 5000)
  assert.equal(metricValue(snapshot, "total_customers"), 1)
})

test("date filtering applies to purchases and customers but not active memberships", () => {
  const range = resolveSalesDateRange({ preset: "7d", now: NOW })
  const snapshot = buildSalesOverviewSnapshot({
    now: NOW,
    dateRange: range,
    profiles: [
      profile({
        id: "p-new",
        email: "new@customer.com",
        createdAt: "2026-09-20T00:00:00.000Z",
      }),
      profile({
        id: "p-old",
        email: "old@customer.com",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    ],
    orders: [
      order({
        id: "o-new",
        customerEmail: "new@customer.com",
        purchasedAt: "2026-09-20T00:00:00.000Z",
        amountPaidCents: 1000,
      }),
      order({
        id: "o-old",
        customerEmail: "old@customer.com",
        purchasedAt: "2026-01-15T00:00:00.000Z",
        amountPaidCents: 2000,
      }),
    ],
    subscriptions: [
      subscription({
        id: "s-old",
        customerEmail: "old@customer.com",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    ],
    sponsoredMembers: [],
    marketingConsents: [],
  })

  assert.equal(metricValue(snapshot, "total_customers"), 1)
  assert.equal(metricValue(snapshot, "one_time_purchases"), 1)
  assert.equal(metricValue(snapshot, "revenue_collected"), 1000)
  assert.equal(metricValue(snapshot, "active_memberships"), 1)
  const active = snapshot.metrics.find((m) => m.id === "active_memberships")
  assert.equal(active?.dateFilterApplies, false)
})

test("product and tier breakdowns aggregate correctly including sponsored seats", () => {
  const sponsored: OverviewSponsoredMemberInput = {
    id: "om1",
    userId: "u-s",
    email: "sponsored@org.com",
    status: "active",
    planName: "Elevate Platinum",
    planSlug: "plan-3",
    activatedAt: "2026-09-01T00:00:00.000Z",
    customerName: "Sam",
    customerRole: "user",
  }

  const snapshot = buildSalesOverviewSnapshot({
    now: NOW,
    dateRange: resolveSalesDateRange({ preset: "all", now: NOW }),
    profiles: [
      profile({ id: "p1", email: "buyer@customer.com" }),
      profile({ id: "p2", email: "gold@customer.com" }),
      profile({ id: "p3", email: "sponsored@org.com" }),
    ],
    orders: [
      order({
        id: "o1",
        customerEmail: "buyer@customer.com",
        items: [
          {
            productId: "prod-a",
            productName: "Autoimmune Course",
            quantity: 1,
            unitAmountCents: 19700,
            currency: "usd",
          },
        ],
        amountPaidCents: 19700,
      }),
      order({
        id: "o2",
        customerEmail: "buyer@customer.com",
        items: [
          {
            productId: "prod-a",
            productName: "Autoimmune Course",
            quantity: 1,
            unitAmountCents: 19700,
            currency: "usd",
          },
        ],
        amountPaidCents: 19700,
      }),
    ],
    subscriptions: [
      subscription({
        id: "s1",
        customerEmail: "gold@customer.com",
        planName: "Elevate Gold",
        planSlug: "plan-2",
      }),
    ],
    sponsoredMembers: [sponsored],
    marketingConsents: [],
  })

  assert.equal(snapshot.purchasesByProduct.length, 1)
  assert.equal(snapshot.purchasesByProduct[0]?.purchaseCount, 2)
  assert.equal(snapshot.purchasesByProduct[0]?.revenueCents, 39400)
  assert.equal(metricValue(snapshot, "active_memberships"), 2)
  assert.ok(
    snapshot.membershipsByTier.some(
      (row) => row.source === "sponsored" && row.activeCount === 1
    )
  )
  assert.ok(
    snapshot.membershipsByTier.some(
      (row) => row.tierKey === "gold" && row.activeCount === 1
    )
  )
})

test("CSV and XLSX respect date filter and omit sensitive fields", async () => {
  const range = resolveSalesDateRange({ preset: "30d", now: NOW })
  const snapshot = buildSalesOverviewSnapshot({
    now: NOW,
    dateRange: range,
    profiles: [profile({ id: "p1", email: "real@customer.com" })],
    orders: [
      order({
        id: "o-in",
        customerEmail: "real@customer.com",
        purchasedAt: "2026-09-10T00:00:00.000Z",
        amountPaidCents: 3300,
        stripeCheckoutSessionId: "cs_live_secret_should_not_export",
      }),
      order({
        id: "o-out",
        customerEmail: "real@customer.com",
        purchasedAt: "2025-01-01T00:00:00.000Z",
        amountPaidCents: 9999,
      }),
    ],
    subscriptions: [],
    sponsoredMembers: [],
    marketingConsents: [
      {
        email: "real@customer.com",
        status: "active",
        source: "checkout",
        consentedAt: "2026-09-10T00:00:00.000Z",
      },
    ],
  })

  const csv = buildSalesOverviewCsv(snapshot)
  assert.match(csv, /Last 30 days/)
  assert.match(csv, /\$33\.00/)
  assert.doesNotMatch(csv, /\$99\.99/)
  assert.match(csv, /SECTION,SUMMARY/)
  assert.match(csv, /SECTION,TRANSACTIONS/)
  assert.match(csv, /SECTION,PURCHASES BY PRODUCT/)
  assert.match(csv, /SECTION,MEMBERSHIPS BY TIER/)
  assert.match(csv, /SECTION,MARKETING CONSENT/)

  for (const forbidden of SALES_EXPORT_FORBIDDEN_SUBSTRINGS) {
    assert.doesNotMatch(csv.toLowerCase(), new RegExp(forbidden))
  }
  assert.doesNotMatch(csv, /cs_live_secret_should_not_export/)

  const xlsx = await buildSalesOverviewXlsx(snapshot)
  assert.ok(xlsx.byteLength > 1000)
  assert.equal(xlsx[0], 0x50)
  assert.equal(xlsx[1], 0x4b)

  const xlsxText = xlsx.toString("utf8")
  for (const forbidden of SALES_EXPORT_FORBIDDEN_SUBSTRINGS) {
    assert.equal(
      xlsxText.toLowerCase().includes(forbidden),
      false,
      `xlsx leaked ${forbidden}`
    )
  }
  assert.equal(xlsxText.includes("cs_live_secret_should_not_export"), false)
})

test("refresh retains filter via search-param helpers (date range label preserved)", () => {
  const range = resolveSalesDateRange({
    preset: "custom",
    from: "2026-09-01",
    to: "2026-09-15",
    now: NOW,
  })
  assert.equal(range.preset, "custom")
  assert.match(range.label, /2026-09-01/)

  const snapshot = buildSalesOverviewSnapshot({
    now: NOW,
    dateRange: range,
    profiles: [],
    orders: [],
    subscriptions: [],
    sponsoredMembers: [],
    marketingConsents: [],
  })
  assert.equal(snapshot.dateRange.preset, "custom")
  assert.match(TEST_DATA_EXCLUSION_SUMMARY, /example\.com/)
})

test("unauthorized export access is enforced in the service and route", () => {
  const service = readFileSync(
    new URL("./services/sales-overview.service.ts", import.meta.url),
    "utf8"
  )
  const route = readFileSync(
    new URL("../../app/api/admin/sales-overview/export/route.ts", import.meta.url),
    "utf8"
  )
  const schema = readFileSync(
    new URL("./schemas/date-range.ts", import.meta.url),
    "utf8"
  )
  assert.match(service, /requireAdminActor/)
  assert.match(service, /forbidden/)
  assert.match(route, /exportSalesOverview/)
  assert.match(route, /403/)
  assert.match(route, /authentication_required/)
  assert.match(schema, /salesExportFormatSchema/)
  assert.match(route, /parseSalesExportSearchParams/)
})

test("orders query selects products.title via order_items FK (not products.name)", () => {
  // Regression: PostgREST error "column products_2.name does not exist"
  // — products table column is `title`, not `name`.
  const service = readFileSync(
    new URL("./services/sales-overview.service.ts", import.meta.url),
    "utf8"
  )
  assert.match(
    service,
    /products!order_items_product_id_fkey\s*\(\s*id,\s*title\s*\)/
  )
  assert.doesNotMatch(service, /products\s*\(\s*id,\s*name\s*\)/)
  assert.match(service, /product\.title/)
})
