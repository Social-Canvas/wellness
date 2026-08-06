"use client"

import * as React from "react"

import {
  ANNUAL_SAVINGS_BADGE_LABEL,
  BILLING_HELPER_COPY,
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
 * Compact Monthly / Annual billing selector.
 * Visual toggle with radio-group semantics; parent owns URL sync.
 */
export function MembershipBillingToggle({
  value,
  onChange,
}: MembershipBillingToggleProps) {
  const optionRefs = React.useRef<
    Partial<Record<BillingUrlValue, HTMLButtonElement | null>>
  >({})
  const isAnnual = value === "annual"

  function select(next: BillingUrlValue) {
    if (next === value) {
      return
    }
    onChange(next)
  }

  function onKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    current: BillingUrlValue
  ) {
    const next = nextBillingOnKey(current, event.key)
    if (!next) {
      return
    }
    event.preventDefault()
    select(next)
    optionRefs.current[next]?.focus()
  }

  function toggleBilling() {
    select(isAnnual ? "monthly" : "annual")
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-3 sm:gap-y-1.5">
        <div
          role="radiogroup"
          aria-label="Billing frequency"
          className="inline-flex items-center gap-3"
        >
          {BILLING_TOGGLE_OPTIONS.map((option) => {
            const selected = value === option.id
            const beforeTrack = option.id === "monthly"

            return (
              <React.Fragment key={option.id}>
                <button
                  ref={(node) => {
                    optionRefs.current[option.id] = node
                  }}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => select(option.id)}
                  onKeyDown={(event) => onKeyDown(event, option.id)}
                  className={cn(
                    "min-h-11 rounded-md px-1 text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
                    selected
                      ? "font-semibold text-ink"
                      : "font-medium text-ink-soft hover:text-ink"
                  )}
                >
                  {option.label}
                </button>

                {beforeTrack ? (
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-hidden="true"
                    onClick={toggleBilling}
                    className={cn(
                      "relative inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-full",
                      "focus-visible:outline-none"
                    )}
                  >
                    <span
                      className={cn(
                        "relative block h-7 w-[3.25rem] rounded-full border border-line bg-surface",
                        isAnnual && "border-blue/40 bg-blue/10"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1/2 left-1 size-5 -translate-y-1/2 rounded-full bg-blue shadow-sm",
                          "transition-transform duration-200 ease-out motion-reduce:transition-none",
                          isAnnual && "translate-x-[1.55rem]"
                        )}
                      />
                    </span>
                  </button>
                ) : null}
              </React.Fragment>
            )
          })}
        </div>

        <span
          aria-hidden="true"
          className="rounded-full bg-green/10 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-green-deep"
        >
          {ANNUAL_SAVINGS_BADGE_LABEL}
        </span>
      </div>

      <p className="text-center text-xs text-ink-soft" aria-live="polite">
        {BILLING_HELPER_COPY[value]}
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
