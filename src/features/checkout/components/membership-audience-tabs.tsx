"use client"

import * as React from "react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import {
  MEMBERSHIP_TABS,
  MEMBERSHIP_SECTION_COPY,
  NONPROFIT_INQUIRY_CTA,
  NONPROFIT_INQUIRY_HREF,
  NONPROFIT_MEMBERSHIP_BENEFITS,
  NONPROFIT_PUBLIC_PRICING_CONFIRMED,
  buildMembershipAudienceUrl,
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
        <NonprofitMembershipOverview />
      </div>
    </div>
  )
}

function NonprofitMembershipOverview() {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h3 className="font-display text-xl font-medium text-ink md:text-2xl">
        {MEMBERSHIP_SECTION_COPY.nonprofit.heading}
      </h3>
      <p className="mt-2 text-sm text-ink-soft md:text-base">
        {MEMBERSHIP_SECTION_COPY.nonprofit.description}
      </p>

      <ul className="mt-8 space-y-3 text-left">
        {NONPROFIT_MEMBERSHIP_BENEFITS.map((benefit) => (
          <li
            key={benefit}
            className="relative rounded-2xl border border-line bg-surface px-4 py-3 pl-10 text-sm text-ink-soft shadow-sm"
          >
            <span
              aria-hidden
              className="absolute left-4 top-3 font-bold text-blue"
            >
              ✓
            </span>
            {benefit}
          </li>
        ))}
      </ul>

      {!NONPROFIT_PUBLIC_PRICING_CONFIRMED ? (
        <p className="mt-6 text-sm text-ink-soft">
          Nonprofit membership is arranged through partnership — seat allowances
          and plan assignments are set with your organization. There is no
          self-serve nonprofit Checkout on this page.
        </p>
      ) : null}

      <Link
        href={NONPROFIT_INQUIRY_HREF}
        className={cn(
          buttonVariants({ size: "lg" }),
          "mt-8 inline-flex min-h-11"
        )}
      >
        {NONPROFIT_INQUIRY_CTA}
      </Link>
    </div>
  )
}
