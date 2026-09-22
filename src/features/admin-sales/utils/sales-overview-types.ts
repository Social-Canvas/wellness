export type SalesDateRangePreset =
  | "all"
  | "today"
  | "7d"
  | "30d"
  | "month"
  | "custom"

export type SalesDateRange = {
  preset: SalesDateRangePreset
  /** Inclusive start (UTC). */
  start: Date | null
  /** Exclusive end (UTC). */
  end: Date | null
  label: string
}

export type MetricReliability = "authoritative" | "partial" | "unavailable"

export type SalesMetricCard = {
  id:
    | "total_customers"
    | "one_time_purchases"
    | "active_memberships"
    | "successful_payments"
    | "revenue_collected"
  label: string
  value: number | null
  displayValue: string
  tooltip: string
  reliability: MetricReliability
  note: string | null
  dateFilterApplies: boolean
}

export type ProductPurchaseBreakdownRow = {
  productId: string
  productName: string
  purchaseCount: number
  revenueCents: number
  currency: string
}

export type MembershipTierBreakdownRow = {
  tierKey: string
  tierLabel: string
  activeCount: number
  source: "personal_stripe" | "sponsored" | "mixed"
}

export type RecentSaleRow = {
  id: string
  customerName: string | null
  customerEmail: string
  productOrPlan: string
  type: "one_time" | "membership"
  amountCents: number | null
  currency: string | null
  occurredAt: string
  status: string
}

export type MarketingConsentExportRow = {
  email: string
  status: string
  source: string
  consentedAt: string
}

export type SalesOverviewSnapshot = {
  generatedAt: string
  dateRange: SalesDateRange
  metrics: SalesMetricCard[]
  purchasesByProduct: ProductPurchaseBreakdownRow[]
  membershipsByTier: MembershipTierBreakdownRow[]
  recentSales: RecentSaleRow[]
  marketingConsents: MarketingConsentExportRow[]
  limitations: string[]
  exclusionSummary: string
}

export type SalesOverviewQuery = {
  preset: SalesDateRangePreset
  from?: string
  to?: string
  now?: Date
}
