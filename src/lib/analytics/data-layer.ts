import { normalizeAnalyticsCurrency } from "./currency"
import { sanitizeAnalyticsEvent } from "./sanitize"
import type {
  AnalyticsEvent,
  BeginCheckoutAnalyticsEvent,
  LeadAnalyticsEvent,
  PurchaseAnalyticsEvent,
} from "./types"

export type DataLayerSink = {
  push: (event: Record<string, unknown>) => void
}

function browserDataLayer(): DataLayerSink {
  const target = window as Window & { dataLayer?: Array<Record<string, unknown>> }
  if (!Array.isArray(target.dataLayer)) {
    target.dataLayer = []
  }
  return {
    push(event) {
      target.dataLayer?.push(event)
    },
  }
}

export function pushAnalyticsEvent(
  event: AnalyticsEvent,
  sink: DataLayerSink = typeof window === "undefined" ? { push() {} } : browserDataLayer()
): void {
  const sanitized = sanitizeAnalyticsEvent(event)
  sink.push(sanitized as unknown as Record<string, unknown>)
}

export function trackSignup(sink?: DataLayerSink): void {
  pushAnalyticsEvent({ event: "signup" }, sink ?? (typeof window === "undefined" ? { push() {} } : browserDataLayer()))
}

export function trackLead(
  input: { leadType: string; source?: string | null },
  sink?: DataLayerSink
): void {
  const source = input.source?.trim()
  const payload: LeadAnalyticsEvent = source
    ? { event: "lead", lead_type: input.leadType, source }
    : { event: "lead", lead_type: input.leadType }
  pushAnalyticsEvent(
    payload,
    sink ?? (typeof window === "undefined" ? { push() {} } : browserDataLayer())
  )
}

export function trackBeginCheckout(
  input: {
    itemId: string
    itemName?: string | null
    value?: number | null
    currency?: string | null
  },
  sink?: DataLayerSink
): void {
  const event: BeginCheckoutAnalyticsEvent = {
    event: "begin_checkout",
    items: [
      {
        item_id: input.itemId,
        ...(input.itemName?.trim() ? { item_name: input.itemName.trim() } : {}),
      },
    ],
  }
  if (typeof input.value === "number" && Number.isFinite(input.value)) {
    event.value = input.value
  }
  const currency = normalizeAnalyticsCurrency(input.currency)
  if (currency) {
    event.currency = currency
  }
  pushAnalyticsEvent(
    event,
    sink ?? (typeof window === "undefined" ? { push() {} } : browserDataLayer())
  )
}

export function trackPurchase(
  input: {
    transactionId: string
    itemId?: string | null
    itemName?: string | null
    value?: number | null
    currency?: string | null
  },
  sink?: DataLayerSink
): void {
  const event: PurchaseAnalyticsEvent = {
    event: "purchase",
    transaction_id: input.transactionId,
    items: input.itemId
      ? [
          {
            item_id: input.itemId,
            ...(input.itemName?.trim() ? { item_name: input.itemName.trim() } : {}),
          },
        ]
      : [],
  }
  if (typeof input.value === "number" && Number.isFinite(input.value)) {
    event.value = input.value
  }
  const currency = normalizeAnalyticsCurrency(input.currency)
  if (currency) {
    event.currency = currency
  }
  pushAnalyticsEvent(
    event,
    sink ?? (typeof window === "undefined" ? { push() {} } : browserDataLayer())
  )
}
