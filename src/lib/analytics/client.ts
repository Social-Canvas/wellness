"use client"

import {
  trackBeginCheckout as pushBeginCheckout,
  trackLead as pushLead,
  trackPurchase as pushPurchase,
  trackSignup as pushSignup,
  trackViewItem as pushViewItem,
} from "./data-layer"
import {
  createSessionPurchaseDedupeStore,
  shouldFirePurchaseEvent,
} from "./purchase-dedupe"

const sessionPurchaseStore = createSessionPurchaseDedupeStore()

export function trackSignup(): void {
  pushSignup()
}

export function trackLead(input: { leadType: string; source?: string | null }): void {
  pushLead(input)
}

export function trackViewItem(input: {
  itemId: string
  itemName?: string | null
  value?: number | null
  currency?: string | null
}): void {
  if (!input.itemId.trim()) {
    return
  }
  pushViewItem(input)
}

export function trackBeginCheckout(input: {
  itemId: string
  itemName?: string | null
  value?: number | null
  currency?: string | null
}): void {
  if (!input.itemId.trim()) {
    return
  }
  pushBeginCheckout(input)
}

export function trackPurchaseOnce(input: {
  transactionId: string
  itemId?: string | null
  itemName?: string | null
  value?: number | null
  currency?: string | null
}): boolean {
  if (!shouldFirePurchaseEvent(sessionPurchaseStore, input.transactionId)) {
    return false
  }
  pushPurchase(input)
  return true
}

export function redirectToCheckout(
  url: string,
  analytics: {
    itemId: string
    itemName?: string | null
    value?: number | null
    currency?: string | null
  }
): void {
  trackBeginCheckout(analytics)
  window.location.assign(url)
}
