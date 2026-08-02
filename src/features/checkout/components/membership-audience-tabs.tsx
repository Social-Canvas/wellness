"use client"

import * as React from "react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import {
  MEMBERSHIP_TABS,
  MEMBERSHIP_SECTION_COPY,
  NONPROFIT_MEMBERSHIP_BENEFITS,
  NONPROFIT_SEAT_PLANS,
  NONPROFIT_SUPPORTING_NOTE,
  buildMembershipAudienceUrl,
  buildNonprofitInquiryHref,
  nextAudienceOnKey,
  parseMembershipAudienceParam,
  type MembershipAudienceId,
} from "@/features/checkout/utils/membership-audience"
import { cn } from "@/lib/utils"

type MembershipAudienceTabsProps = {
  initialAudience: MembershipAudienceId
  individualsPanel: React.ReactNode
}

export function MembershipAudienceTabs({
  initialAudience,
  individualsPanel,
}: MembershipAudienceTabsProps) {
  const [audience, setAudience] =
    React.useState<MembershipAudienceId>(initialAudience)
  const tabRefs = React.useRef<Partial<Record<MembershipAudienceId, HTMLButtonElement | null>>>(
    {}
  )

  React.useEffect(() => {
    function onPopState() {
      setAudience(parseMembershipAudienceParam(
        new URLSearchParams(window.location.search).get("membership")
      ))
    }

    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  function selectAudience(
    next: MembershipAudienceId,
    options?: { focus?: boolean; historyMode?: "push" | "replace" }
  ) {
    setAudience(next)

    if (typeof window === "undefined") {
      return
    }

    const url = buildMembershipAudienceUrl(
      window.location.pathname,
      window.location.search,
      next,
      "#memberships"
    )
    const mode = options?.historyMode ?? "push"
    if (mode === "replace") {
      window.history.replaceState({ membership: next }, "", url)
    } else {
      window.history.pushState({ membership: next }, "", url)
    }

    if (options?.focus) {
      tabRefs.current[next]?.focus()
    }
  }

  function onTabKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    current: MembershipAudienceId
  ) {
    const next = nextAudienceOnKey(current, event.key)
    if (!next) {
      return
    }
    event.preventDefault()
    selectAudience(next, { focus: true })
  }

  return (
    <div className="mt-8 w-full max-w-full overflow-x-hidden">
      <div className="flex justify-center">
        <div
          role="tablist"
          aria-label="Membership audience"
          className="inline-flex w-full max-w-lg flex-col gap-2 rounded-2xl border border-line bg-surface p-1.5 sm:w-auto sm:flex-row sm:rounded-full"
        >
          {MEMBERSHIP_TABS.map((tab) => {
            const selected = audience === tab.id
            return (
              <button
                key={tab.id}
                ref={(node) => {
                  tabRefs.current[tab.id] = node
                }}
                type="button"
                role="tab"
                id={tab.tabId}
                aria-selected={selected}
                aria-controls={tab.panelId}
                tabIndex={selected ? 0 : -1}
                onClick={() => selectAudience(tab.id)}
                onKeyDown={(event) => onTabKeyDown(event, tab.id)}
                className={cn(
                  "min-h-11 flex-1 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
                  selected
                    ? "bg-blue text-white shadow-sm"
                    : "bg-transparent text-ink-soft hover:text-ink"
                )}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id="membership-panel-individuals"
        aria-labelledby="membership-tab-individuals"
        hidden={audience !== "individuals"}
        className={cn(
          "mt-9 w-full max-w-full",
          audience !== "individuals" && "hidden"
        )}
      >
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h3 className="font-display text-xl font-medium text-ink md:text-2xl">
            {MEMBERSHIP_SECTION_COPY.individuals.heading}
          </h3>
          <p className="mt-2 text-sm text-ink-soft md:text-base">
            {MEMBERSHIP_SECTION_COPY.individuals.description}
          </p>
        </div>
        {individualsPanel}
      </div>

      <div
        role="tabpanel"
        id="membership-panel-nonprofit"
        aria-labelledby="membership-tab-nonprofit"
        hidden={audience !== "nonprofit"}
        className={cn(
          "mt-9 w-full max-w-full",
          audience !== "nonprofit" && "hidden"
        )}
      >
        <NonprofitMembershipPlans />
      </div>
    </div>
  )
}

function NonprofitMembershipPlans() {
  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <h3 className="font-display text-xl font-medium text-ink md:text-2xl">
          {MEMBERSHIP_SECTION_COPY.nonprofit.heading}
        </h3>
        <p className="mt-2 text-sm text-ink-soft md:text-base">
          {MEMBERSHIP_SECTION_COPY.nonprofit.description}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {NONPROFIT_SEAT_PLANS.map((plan) => (
          <article
            key={plan.slug}
            className="relative flex h-full flex-col rounded-[18px] border border-line bg-surface p-[28px_26px] text-left shadow-sm"
          >
            <span className="text-[11.5px] font-bold tracking-[0.12em] text-green-deep uppercase">
              Nonprofit
            </span>
            <h4 className="mt-1.5 font-display text-2xl font-medium text-ink">
              {plan.name}
            </h4>
            <p className="mt-1 text-sm text-ink-soft">{plan.seatRangeLabel}</p>
            <div className="mt-1 mb-4 font-display text-[30px] font-semibold text-ink">
              {plan.priceLabel}
              <small className="ml-1 font-body text-sm font-normal text-ink-soft">
                {plan.priceSuffix}
              </small>
            </div>

            <ul className="mb-5 list-none">
              {NONPROFIT_MEMBERSHIP_BENEFITS.map((benefit) => (
                <li
                  key={benefit}
                  className="relative py-1 pl-[22px] text-sm text-ink-soft"
                >
                  <span
                    aria-hidden
                    className="absolute left-0 font-bold text-blue"
                  >
                    ✓
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>

            <Link
              href={buildNonprofitInquiryHref(plan.slug)}
              className={cn(
                buttonVariants({
                  variant: plan.customPricing ? "outline" : "default",
                  size: "block",
                }),
                "mt-auto min-h-11"
              )}
            >
              {plan.ctaLabel}
            </Link>
          </article>
        ))}
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-ink-soft">
        {NONPROFIT_SUPPORTING_NOTE}
      </p>
    </div>
  )
}
