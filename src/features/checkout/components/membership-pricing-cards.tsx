import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import {
  MEMBERSHIP_PLAN_SLUGS,
  type MembershipPlanCardView,
  type MembershipPlanSlug,
} from "@/features/checkout/utils/membership-plan-cta-state"
import {
  ELEVATE_MEMBERSHIPS,
  type MembershipTierContent,
} from "@/lib/constants/elevate-brand"
import { cn } from "@/lib/utils"

function membershipAnchorId(slug: MembershipPlanSlug): string {
  if (slug === "plan-1") return "membership-core"
  if (slug === "plan-2") return "membership-gold"
  return "membership-platinum"
}

type MembershipPricingCardsProps = {
  cardViews: MembershipPlanCardView[]
}

export function MembershipPricingCards({ cardViews }: MembershipPricingCardsProps) {
  const viewsBySlug = new Map(cardViews.map((view) => [view.planSlug, view]))

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {ELEVATE_MEMBERSHIPS.map((tier) => {
        const view = viewsBySlug.get(tier.slug) ?? {
          planSlug: tier.slug,
          kind: "join" as const,
          isCurrent: false,
          badge: null,
          sourceLabel: null,
          statusNote: null,
          ctaLabel: `Join ${tier.name}`,
          ctaHref: `/checkout/consent?type=membership&planSlug=${tier.slug}&interval=monthly`,
          ctaDisabled: false,
          allowsCheckout: true,
          visuallyCurrent: false,
        }

        return (
          <MembershipPricingCard
            key={tier.slug}
            tier={tier}
            view={view}
          />
        )
      })}
    </div>
  )
}

function MembershipPricingCard({
  tier,
  view,
}: {
  tier: MembershipTierContent
  view: MembershipPlanCardView
}) {
  return (
    <article
      id={membershipAnchorId(tier.slug)}
      aria-current={view.isCurrent ? "true" : undefined}
      className={cn(
        "relative flex h-full flex-col rounded-[18px] border bg-surface p-[28px_26px] text-left shadow-sm scroll-mt-32",
        view.visuallyCurrent
          ? "border-2 border-green ring-1 ring-green/30"
          : tier.featured
            ? "border-2 border-blue"
            : "border-line"
      )}
    >
      {view.badge ? (
        <span className="absolute top-[-13px] left-1/2 -translate-x-1/2 rounded-[20px] bg-green px-3.5 py-1.5 text-[11px] font-bold tracking-[0.1em] text-white uppercase">
          {view.badge}
        </span>
      ) : tier.featured ? (
        <span className="absolute top-[-13px] left-1/2 -translate-x-1/2 rounded-[20px] bg-blue px-3.5 py-1.5 text-[11px] font-bold tracking-[0.1em] text-white uppercase">
          Most popular
        </span>
      ) : null}

      <span className="text-[11.5px] font-bold tracking-[0.12em] text-green-deep uppercase">
        Membership
      </span>
      <h3 className="mt-1.5 font-display text-2xl font-medium text-ink">
        {tier.name}
      </h3>
      {view.isCurrent ? (
        <p className="sr-only">
          This is your current {tier.name} membership.
        </p>
      ) : null}
      <div className="mt-1 mb-3.5 font-display text-[30px] font-semibold text-ink">
        {tier.priceLabel}
        <small className="ml-1 font-body text-sm font-normal text-ink-soft">
          / mo
        </small>
      </div>

      <p className="mb-3 text-sm text-ink-soft">{tier.whoItIsFor}</p>

      {view.sourceLabel ? (
        <p className="mb-2 text-sm font-semibold text-ink">{view.sourceLabel}</p>
      ) : null}

      {view.statusNote ? (
        <p className="mb-3 text-sm text-ink-soft" role="status">
          {view.statusNote}
        </p>
      ) : null}

      <ul className="mb-5 list-none">
        {tier.features.map((feature) => (
          <li
            key={feature}
            className="relative py-1.5 pl-[22px] text-sm text-ink-soft"
          >
            <span aria-hidden className="absolute left-0 font-bold text-blue">
              ✓
            </span>
            {feature}
          </li>
        ))}
      </ul>

      {view.ctaDisabled || !view.ctaHref ? (
        <button
          type="button"
          disabled
          aria-disabled="true"
          title={view.statusNote ?? view.ctaLabel}
          className={cn(
            buttonVariants({
              variant: "outline",
              size: "block",
            }),
            "mt-auto cursor-not-allowed whitespace-normal leading-snug opacity-60"
          )}
        >
          {view.ctaLabel}
        </button>
      ) : (
        <Link
          href={view.ctaHref}
          className={cn(
            buttonVariants({
              variant: view.isCurrent
                ? "default"
                : tier.ctaVariant,
              size: "block",
            }),
            "mt-auto whitespace-normal text-center leading-snug"
          )}
        >
          {view.ctaLabel}
        </Link>
      )}
    </article>
  )
}

/** Ensures all three plan slugs stay in sync with brand content. */
export function assertMembershipCardCoverage(cardViews: MembershipPlanCardView[]) {
  return MEMBERSHIP_PLAN_SLUGS.every((slug) =>
    cardViews.some((view) => view.planSlug === slug)
  )
}
