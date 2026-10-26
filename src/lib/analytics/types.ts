export const ANALYTICS_EVENT_NAMES = [
  "signup",
  "lead",
  "begin_checkout",
  "purchase",
] as const

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number]

export type AnalyticsItem = {
  item_id: string
  item_name?: string
}

export type SignupAnalyticsEvent = {
  event: "signup"
}

export type LeadAnalyticsEvent = {
  event: "lead"
  lead_type: string
  source?: string
}

export type BeginCheckoutAnalyticsEvent = {
  event: "begin_checkout"
  currency?: string
  value?: number
  items: AnalyticsItem[]
}

export type PurchaseAnalyticsEvent = {
  event: "purchase"
  transaction_id: string
  currency?: string
  value?: number
  items: AnalyticsItem[]
}

export type AnalyticsEvent =
  | SignupAnalyticsEvent
  | LeadAnalyticsEvent
  | BeginCheckoutAnalyticsEvent
  | PurchaseAnalyticsEvent

export type PurchaseDedupeStore = {
  has(transactionId: string): boolean
  add(transactionId: string): void
}
