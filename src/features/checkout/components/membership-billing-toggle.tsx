"use client"

import * as React from "react"

import {
  BILLING_TOGGLE_OPTIONS,
  buildMembershipBillingUrl,
  nextBillingOnKey,
  parseBillingParam,
  type BillingUrlValue,
} from "@/features/checkout/utils/membership-billing"
import { cn } from "@/lib/utils"

type MembershipBillingToggleProps = {
  value: BillingUrlValue
  onChange: (next: BillingUrlValue) => void
}

/**
 * Accessible segmented control for Monthly / Annual membership pricing.
 * Parent owns URL sync so Back/Forward and server defaults stay consistent.
 */
export function MembershipBillingToggle({
  value,
  onChange,
}: MembershipBillingToggleProps) {
  const optionRefs = React.useRef<
    Partial<Record<BillingUrlValue, HTMLButtonElement | null>>
  >({})

  function onKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    current: BillingUrlValue
  ) {
    const next = nextBillingOnKey(current, event.key)
    if (!next) {
      return
    }
    event.preventDefault()
    onChange(next)
    optionRefs.current[next]?.focus()
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        role="radiogroup"
        aria-label="Billing interval"
        className="inline-flex w-full max-w-md flex-col gap-2 rounded-2xl border border-line bg-surface p-1.5 sm:w-auto sm:flex-row sm:rounded-full"
      >
        {BILLING_TOGGLE_OPTIONS.map((option) => {
          const selected = value === option.id
          return (
            <button
              key={option.id}
              ref={(node) => {
                optionRefs.current[option.id] = node
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(option.id)}
              onKeyDown={(event) => onKeyDown(event, option.id)}
              className={cn(
                "rounded-full px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2",
                selected
                  ? "bg-blue text-white"
                  : "bg-transparent text-ink-soft hover:text-ink"
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      <p className="text-center text-xs text-ink-soft" aria-live="polite">
        {value === "annual"
          ? "Billed once per year. Renews automatically unless cancelled."
          : "Billed every month. Renews automatically unless cancelled."}
      </p>
    </div>
  )
}

type MembershipBillingSyncProps = {
  initialBilling: BillingUrlValue
  children: (state: {
    billing: BillingUrlValue
    setBilling: (next: BillingUrlValue) => void
  }) => React.ReactNode
}

/**
 * Owns billing URL state (pushState + popstate) without a full page reload.
 */
export function MembershipBillingSync({
  initialBilling,
  children,
}: MembershipBillingSyncProps) {
  const [billing, setBillingState] =
    React.useState<BillingUrlValue>(initialBilling)

  React.useEffect(() => {
    function onPopState() {
      setBillingState(
        parseBillingParam(
          new URLSearchParams(window.location.search).get("billing")
        )
      )
    }

    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  function setBilling(next: BillingUrlValue) {
    setBillingState(next)
    if (typeof window === "undefined") {
      return
    }
    const url = buildMembershipBillingUrl(
      window.location.pathname,
      window.location.search,
      next,
      "#memberships"
    )
    window.history.pushState({ billing: next }, "", url)
  }

  return <>{children({ billing, setBilling })}</>
}
