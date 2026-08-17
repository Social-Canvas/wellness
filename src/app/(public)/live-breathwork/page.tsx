import type { Metadata } from "next"
import Link from "next/link"

import { TrialLiveSessionCard } from "@/features/live-sessions/components/LiveSessionCards"
import {
  hasConfirmedPublicTrialRegistration,
  listTrialOpenLiveSessions,
} from "@/features/live-sessions/services/live-sessions.service"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import {
  buildLiveBreathworkOfferView,
  type LiveBreathworkOfferState,
} from "@/features/checkout/utils/live-breathwork-offer-state"
import { isLiveMembershipAccess } from "@/features/checkout/utils/membership-plan-cta-state"
import {
  LIVE_BREATHWORK_TRIAL_CATALOG_AMOUNT_CENTS,
  LIVE_BREATHWORK_TRIAL_CONFIRMATION_NEEDED,
  isLiveBreathworkTrialPriceApproved,
} from "@/lib/constants/live-breathwork-trial"
import { getEffectiveMembership } from "@/server/services/membership.service"
import { buildPublicPageMetadata } from "@/lib/seo/site-seo"

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Live Breathwork Trial",
  description:
    "One-time Live Breathwork trial for a selected upcoming Elevate session.",
  path: "/live-breathwork",
})

function cardModeFromState(
  state: LiveBreathworkOfferState
): "reserve" | "member_included" | "already_registered" | "unavailable" {
  if (state === "member_included") return "member_included"
  if (state === "already_registered") return "already_registered"
  if (state === "unavailable") return "unavailable"
  return "reserve"
}

export default async function LiveBreathworkTrialPage() {
  const [sessionsResult, profileResult] = await Promise.all([
    listTrialOpenLiveSessions(),
    getCurrentProfile(),
  ])
  const priceApproved = isLiveBreathworkTrialPriceApproved()

  // subscriptions.user_id / registrations.user_id are profiles.id
  const userId = profileResult.success ? profileResult.data.id : null
  const membershipResult = userId
    ? await getEffectiveMembership(userId)
    : null
  const membership =
    membershipResult && membershipResult.success ? membershipResult.data : null

  const membershipAccessActive = membership
    ? isLiveMembershipAccess(membership.status)
    : false
  const hasLiveCapability =
    membership?.capabilities.includes("live_online_sessions") ?? false

  const sessions = sessionsResult.success ? sessionsResult.data : []

  const registrationFlags = userId
    ? await Promise.all(
        sessions.map(async (session) => {
          const result = await hasConfirmedPublicTrialRegistration(
            userId,
            session.id
          )
          return [
            session.id,
            result.success ? result.data : false,
          ] as const
        })
      )
    : []
  const registrationMap = new Map(registrationFlags)

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm uppercase tracking-[0.18em] text-ink-soft">
        Live experience
      </p>
      <h1 className="mt-3 font-display text-4xl text-ink">
        Live Breathwork Session
      </h1>
      <p className="mt-4 text-base text-ink-soft">
        Join one selected upcoming live session as a one-time trial. This is the
        same live Zoom session members attend. Trial access does not include
        membership, recordings, or future sessions. After the session you can
        share feedback and explore Elevate memberships.
      </p>
      <p className="mt-3 text-sm text-ink">
        Catalog amount: $
        {(LIVE_BREATHWORK_TRIAL_CATALOG_AMOUNT_CENTS / 100).toFixed(0)}
        {priceApproved
          ? " (approved in app config for sandbox checkout when a Price ID is set)."
          : `. ${LIVE_BREATHWORK_TRIAL_CONFIRMATION_NEEDED}`}
      </p>

      <div className="mt-10 space-y-4">
        {!sessionsResult.success ? (
          <p className="text-sm text-destructive">
            {sessionsResult.error.message}
          </p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-ink-soft">
            No upcoming trial sessions are open right now.{" "}
            <Link href="/programs#memberships" className="underline">
              Explore memberships
            </Link>{" "}
            for ongoing weekly access.
          </p>
        ) : (
          sessions.map((session) => {
            const alreadyRegistered = registrationMap.get(session.id) ?? false
            const view = buildLiveBreathworkOfferView({
              isAuthenticated: Boolean(userId),
              hasLiveOnlineSessionsCapability: hasLiveCapability,
              membershipAccessActive,
              alreadyRegisteredForSelectedSession: alreadyRegistered,
              hasEligibleUpcomingSession: true,
              registeredHref: `/dashboard/live-sessions/${session.id}/join?trial=1`,
              reserveHref: "/live-breathwork",
            })

            return (
              <TrialLiveSessionCard
                key={session.id}
                session={session}
                mode={cardModeFromState(view.state)}
                registeredHref={view.ctaHref}
              />
            )
          })
        )}
      </div>
    </main>
  )
}
