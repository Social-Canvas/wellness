import Link from "next/link"

import { Badge } from "@/components/ui"
import { ManageBillingButton } from "@/features/billing/components/manage-billing-button"
import { MembershipJoinButton } from "@/features/dashboard/components/membership-join-button"
import {
  formatCapabilityCustomerLabels,
  formatMembershipAccessSource,
  formatMembershipStatusLabel,
  MEMBERSHIP_NO_RECORDINGS_COPY,
  MEMBERSHIP_NO_SESSION_COPY,
  MEMBERSHIP_RECORDINGS_PATH,
  resolveLiveSessionScheduleState,
} from "@/features/dashboard/utils/library-membership"
import type { LiveSessionPublic } from "@/features/live-sessions/types"
import { RecordedSessionCard } from "@/features/recorded-sessions/components"
import type { RecordedSessionListItem } from "@/features/recorded-sessions/types"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { EffectiveMembership } from "@/server/services/membership.service"

function formatDate(value: string | null): string {
  if (!value) {
    return "—"
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value))
}

function formatSessionWhen(startsAt: string | null): string {
  if (!startsAt) {
    return "Schedule TBD"
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(startsAt))
}

type MembershipHubProps = {
  membership: EffectiveMembership
  upcomingSession: LiveSessionPublic | null
  latestRecordings: RecordedSessionListItem[]
}

export function MembershipHub({
  membership,
  upcomingSession,
  latestRecordings,
}: MembershipHubProps) {
  const accessSource = formatMembershipAccessSource(membership.source)
  const privilegeLabels = formatCapabilityCustomerLabels(membership.capabilities)
  const schedule = upcomingSession
    ? resolveLiveSessionScheduleState({
        startsAt: upcomingSession.startsAt,
        endsAt: upcomingSession.endsAt,
        completedAt: upcomingSession.completedAt,
      })
    : null

  return (
    <div className="space-y-8" data-membership-hub>
      <section className="rounded-2xl border border-line bg-surface px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue">
              Membership
            </p>
            <h1 className="mt-2 font-display text-[28px] font-medium text-ink">
              {membership.effectivePlanName ?? "Elevate Membership"}
            </h1>
          </div>
          <Badge variant="plan">
            {formatMembershipStatusLabel(membership.status)}
          </Badge>
        </div>

        <dl className="mt-5 grid gap-3 text-sm text-ink-soft sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-ink">Access source</dt>
            <dd>{accessSource}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">Access period ends</dt>
            <dd>{formatDate(membership.currentPeriodEnd)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">In-person sessions</dt>
            <dd>
              {membership.canAttendInPerson
                ? "Included as a membership benefit"
                : "Not included in your current plan"}
            </dd>
          </div>
          {membership.organizationName ? (
            <div>
              <dt className="font-semibold text-ink">Organization</dt>
              <dd>{membership.organizationName}</dd>
            </div>
          ) : null}
        </dl>

        {membership.scheduledPlanName ? (
          <p className="mt-4 text-sm text-ink-soft">
            Scheduled change: your plan will change to{" "}
            {membership.scheduledPlanName}
            {membership.currentPeriodEnd
              ? ` on ${formatDate(membership.currentPeriodEnd)}`
              : ""}
            .
          </p>
        ) : null}

        {membership.cancelAtPeriodEnd ? (
          <p className="mt-4 text-sm text-ink-soft">
            Cancellation scheduled. Access continues until{" "}
            {formatDate(membership.currentPeriodEnd)}.
          </p>
        ) : null}

        {privilegeLabels.length > 0 ? (
          <div className="mt-5">
            <p className="text-sm font-semibold text-ink">Included privileges</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
              {privilegeLabels.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-5">
          {membership.hasPersonalBilling ? (
            <ManageBillingButton />
          ) : membership.isSponsored ? (
            <p className="text-sm text-ink-soft">
              Billing is managed by your nonprofit sponsor. Contact your
              administrator for seat or plan changes.
            </p>
          ) : membership.source === "complimentary" ? (
            <p className="text-sm text-ink-soft">
              Complimentary access — plan changes are managed by an
              administrator.
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl font-medium text-ink">
            Upcoming live session
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Weekly live online sessions shared across Elevate memberships.
          </p>
        </div>

        {upcomingSession && schedule ? (
          <article
            className="rounded-2xl border border-line bg-surface px-6 py-6"
            data-upcoming-live-session
          >
            <h3 className="font-display text-xl text-ink">
              {upcomingSession.title}
            </h3>
            {upcomingSession.description ? (
              <p className="mt-2 text-sm text-ink-soft">
                {upcomingSession.description}
              </p>
            ) : null}
            <p className="mt-3 text-sm text-ink">
              {formatSessionWhen(upcomingSession.startsAt)} UTC
            </p>
            <div className="mt-4">
              <MembershipJoinButton
                liveClassId={upcomingSession.id}
                joinAvailable={
                  schedule.kind === "join_open" ? schedule.joinAvailable : false
                }
                scheduleLabel={schedule.label}
              />
            </div>
          </article>
        ) : (
          <p
            className="rounded-2xl border border-dashed border-line bg-cream2/40 px-6 py-8 text-sm text-ink-soft"
            data-no-upcoming-session
          >
            {MEMBERSHIP_NO_SESSION_COPY}
          </p>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-medium text-ink">
              Latest recordings
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Recent membership session recordings from the shared archive.
            </p>
          </div>
          <Link
            href={MEMBERSHIP_RECORDINGS_PATH}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            data-view-all-recordings
          >
            View all recordings
          </Link>
        </div>

        {latestRecordings.length === 0 ? (
          <p
            className="rounded-2xl border border-dashed border-line bg-cream2/40 px-6 py-8 text-sm text-ink-soft"
            data-no-recordings
          >
            {MEMBERSHIP_NO_RECORDINGS_COPY}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {latestRecordings.map((session) => (
              <RecordedSessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
