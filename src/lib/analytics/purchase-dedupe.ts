import type { PurchaseDedupeStore } from "./types"

const ANALYTICS_PURCHASE_DEDUPE_PREFIX = "elevate:gtm:purchase:"

export function purchaseDedupeKey(transactionId: string): string {
  return `${ANALYTICS_PURCHASE_DEDUPE_PREFIX}${transactionId.trim()}`
}

export function shouldFirePurchaseEvent(
  store: PurchaseDedupeStore,
  transactionId: string
): boolean {
  const id = transactionId.trim()
  if (!id) {
    return false
  }
  if (store.has(id)) {
    return false
  }
  store.add(id)
  return true
}

export function createMemoryPurchaseDedupeStore(
  initial: Iterable<string> = []
): PurchaseDedupeStore {
  const seen = new Set<string>(initial)
  return {
    has: (transactionId) => seen.has(transactionId),
    add: (transactionId) => {
      seen.add(transactionId)
    },
  }
}

export function createSessionPurchaseDedupeStore(): PurchaseDedupeStore {
  return {
    has(transactionId) {
      if (typeof window === "undefined") {
        return false
      }
      try {
        return window.sessionStorage.getItem(purchaseDedupeKey(transactionId)) === "1"
      } catch {
        return false
      }
    },
    add(transactionId) {
      if (typeof window === "undefined") {
        return
      }
      try {
        window.sessionStorage.setItem(purchaseDedupeKey(transactionId), "1")
      } catch {
        // Private mode / quota — skip persistence; in-memory GTM still gets one push this page.
      }
    },
  }
}
