"use client"

import { useEffect, useSyncExternalStore } from "react"

const STORAGE_KEY = "elevate_cookie_choice"
const CHANGE_EVENT = "elevate-cookie-choice"

type CookieChoice = "analytics" | "essential"

function publishChoice(choice: CookieChoice) {
  const dataLayer = (window as Window & { dataLayer?: unknown[] }).dataLayer ?? []
  dataLayer.push({
    event: "cookie_consent",
    analytics_storage: choice === "analytics" ? "granted" : "denied",
    ad_storage: "denied",
  })
  ;(window as Window & { dataLayer?: unknown[] }).dataLayer = dataLayer
}

function readChoice(): CookieChoice | null {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === "analytics" || stored === "essential" ? stored : null
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onStoreChange)
  window.addEventListener("storage", onStoreChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onStoreChange)
    window.removeEventListener("storage", onStoreChange)
  }
}

export function CookieConsent() {
  const choice = useSyncExternalStore(subscribe, readChoice, () => null)

  useEffect(() => {
    if (choice) publishChoice(choice)
  }, [choice])

  function save(next: CookieChoice) {
    window.localStorage.setItem(STORAGE_KEY, next)
    publishChoice(next)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }

  if (choice !== null) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface px-4 py-4 shadow-lg">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-soft">
          This site loads Google Tag Manager for product analytics. Essential
          cookies keep sign-in and checkout working. Your choice is sent to the
          tag manager as cookie_consent. A Consent Initialization tag in the
          client&apos;s GTM container is still required before that choice can
          block analytics tags.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="rounded-[var(--radius-button)] border border-line px-3 py-2 text-sm font-semibold text-ink"
            onClick={() => save("essential")}
          >
            Essential only
          </button>
          <button
            type="button"
            className="rounded-[var(--radius-button)] bg-blue px-3 py-2 text-sm font-semibold text-white"
            onClick={() => save("analytics")}
          >
            Allow analytics
          </button>
        </div>
      </div>
    </div>
  )
}
