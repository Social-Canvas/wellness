"use client"

import * as React from "react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import {
  MEMBERSHIP_TABS,
  MEMBERSHIP_SECTION_COPY,
  NONPROFIT_CUSTOM_PRICING_LABEL,
  NONPROFIT_MEMBERSHIP_BENEFITS,
  NONPROFIT_PLAN_CHOICE_DESCRIPTION,
  NONPROFIT_PLAN_CHOICE_HEADING,
  NONPROFIT_SEAT_PLANS,
  NONPROFIT_SHARED_BENEFITS_TITLE,
  NONPROFIT_SUPPORTING_NOTE,
  buildMembershipAudienceUrl,
  buildNonprofitInquiryHref,
  nextAudienceOnKey,
  parseMembershipAudienceParam,
  type MembershipAudienceId,
  type NonprofitSeatPlan,
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
    <div className="mt-8 w-full max-w-full overflow-x-hidden sm:mt-9">
      <div className="flex justify-center">
        <div
          role="tablist"
          aria-label="Membership audience"
          className="inline-flex w-full max-w-[34rem] flex-col gap-1.5 rounded-2xl border border-line bg-surface p-1 sm:w-auto sm:flex-row sm:rounded-full"
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
                  "min-h-11 flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
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
          "mt-9 w-full max-w-full sm:mt-10",
          audience !== "individuals" && "hidden"
        )}
      >
        <div className="mx-auto mb-6 max-w-2xl text-center sm:mb-7">
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
          "mt-9 w-full max-w-full sm:mt-10",
          audience !== "nonprofit" && "hidden"
        )}
      >
        <NonprofitMembershipPlans />
      </div>
    </div>
  )
}

function nonprofitPriceAriaLabel(plan: NonprofitSeatPlan): string {
  const amount = plan.priceLabel.replace(/\$/g, "").replace(/,/g, "")
  if (plan.customPricing) {
    return `${amount} dollars per month, custom pricing`
  }
  return `${amount} dollars per month`
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

      <section
        aria-labelledby="nonprofit-shared-benefits-heading"
        className="mx-auto max-w-[1100px] rounded-2xl border border-line bg-green/5 px-4 py-5 sm:px-6 sm:py-6"
      >
        <h4
          id="nonprofit-shared-benefits-heading"
          className="text-center font-display text-lg font-medium text-ink sm:text-xl"
        >
          {NONPROFIT_SHARED_BENEFITS_TITLE}
        </h4>
        <ul className="mt-4 grid list-none grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-4">
          {NONPROFIT_MEMBERSHIP_BENEFITS.map((benefit) => (
            <li
              key={benefit}
              className="flex items-start gap-2 text-sm text-ink-soft"
            >
              <span
                aria-hidden
                className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-blue/10 text-[10px] font-bold text-blue"
              >
                ✓
              </span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-ink-soft">
          {NONPROFIT_SUPPORTING_NOTE}
        </p>
      </section>

      <div className="mx-auto mt-8 mb-5 max-w-2xl text-center">
        <h4 className="font-display text-lg font-medium text-ink sm:text-xl">
          {NONPROFIT_PLAN_CHOICE_HEADING}
        </h4>
        <p className="mt-1.5 text-sm text-ink-soft">
          {NONPROFIT_PLAN_CHOICE_DESCRIPTION}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
        {NONPROFIT_SEAT_PLANS.map((plan) => (
          <article
            key={plan.slug}
            className="relative flex h-full flex-col rounded-2xl border border-line bg-surface p-5 text-left shadow-sm"
          >
            <span className="text-[11px] font-bold tracking-[0.12em] text-green-deep uppercase">
              Nonprofit
            </span>
            <h5 className="mt-1.5 font-display text-xl font-medium text-ink">
              {plan.name}
            </h5>
            <p className="mt-1 text-sm text-ink-soft">{plan.seatRangeLabel}</p>
            <p
              className={cn(
                "mt-2 font-display text-[26px] font-semibold leading-tight text-ink",
                plan.customPricing ? "mb-1" : "mb-4"
              )}
              aria-label={nonprofitPriceAriaLabel(plan)}
            >
              {plan.priceLabel}
              <small className="ml-1 font-body text-sm font-normal text-ink-soft">
                {plan.priceSuffix}
              </small>
            </p>
            {plan.customPricing ? (
              <p className="mb-4 text-sm text-ink-soft">
                {NONPROFIT_CUSTOM_PRICING_LABEL}
              </p>
            ) : null}

            <Link
              href={buildNonprofitInquiryHref(plan.slug)}
              className={cn(
                buttonVariants({
                  variant: plan.customPricing ? "outline" : "default",
                  size: "block",
                }),
                "mt-auto min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
              )}
            >
              {plan.ctaLabel}
            </Link>
          </article>
        ))}
      </div>
    </div>
  )
}
