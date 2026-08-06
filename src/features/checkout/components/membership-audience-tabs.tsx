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
  NONPROFIT_MISSION_BODY,
  NONPROFIT_MISSION_EYEBROW,
  NONPROFIT_MISSION_HEADING,
  NONPROFIT_SHARED_BENEFITS_TITLE,
  NONPROFIT_SUPPORTING_NOTE,
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
        <NonprofitPartnershipOverview />
      </div>
    </div>
  )
}

function NonprofitPartnershipOverview() {
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

      <aside
        aria-labelledby="nonprofit-mission-heading"
        className="mx-auto mb-8 max-w-3xl rounded-2xl border border-line/80 bg-blue/[0.04] px-5 py-6 text-center sm:px-8 sm:py-7"
      >
        <p className="text-[11px] font-bold tracking-[0.14em] text-green-deep uppercase">
          {NONPROFIT_MISSION_EYEBROW}
        </p>
        <h4
          id="nonprofit-mission-heading"
          className="mt-2 font-display text-lg font-medium text-ink sm:text-xl md:text-[1.35rem]"
        >
          {NONPROFIT_MISSION_HEADING}
        </h4>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft md:text-[15px]">
          {NONPROFIT_MISSION_BODY}
        </p>
      </aside>

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
        <ul className="mt-4 grid list-none grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
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
        <p className="mx-auto mt-5 max-w-2xl text-center text-sm text-ink-soft">
          {NONPROFIT_SUPPORTING_NOTE}
        </p>
      </section>

      <div className="mt-7 flex justify-center">
        <Link
          href={NONPROFIT_INQUIRY_HREF}
          className={cn(
            buttonVariants({ size: "lg" }),
            "min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
          )}
        >
          {NONPROFIT_INQUIRY_CTA}
        </Link>
      </div>
    </div>
  )
}
