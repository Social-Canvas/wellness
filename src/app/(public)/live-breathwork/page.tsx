import Link from "next/link"

import { TrialLiveSessionCard } from "@/features/live-sessions/components/LiveSessionCards"
import { listTrialOpenLiveSessions } from "@/features/live-sessions/services/live-sessions.service"
import {
  LIVE_BREATHWORK_TRIAL_CATALOG_AMOUNT_CENTS,
  LIVE_BREATHWORK_TRIAL_CONFIRMATION_NEEDED,
  isLiveBreathworkTrialPriceApproved,
} from "@/lib/constants/live-breathwork-trial"

export const metadata = {
  title: "Live Breathwork Trial",
  description:
    "One-time Live Breathwork trial for a selected upcoming Elevate session.",
}

export default async function LiveBreathworkTrialPage() {
  const result = await listTrialOpenLiveSessions()
  const priceApproved = isLiveBreathworkTrialPriceApproved()

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
          : ` — ${LIVE_BREATHWORK_TRIAL_CONFIRMATION_NEEDED}`}
      </p>

      <div className="mt-10 space-y-4">
        {!result.success ? (
          <p className="text-sm text-destructive">{result.error.message}</p>
        ) : result.data.length === 0 ? (
          <p className="text-sm text-ink-soft">
            No upcoming trial sessions are open right now.{" "}
            <Link href="/programs#memberships" className="underline">
              Explore memberships
            </Link>{" "}
            for ongoing weekly access.
          </p>
        ) : (
          result.data.map((session) => (
            <TrialLiveSessionCard key={session.id} session={session} />
          ))
        )}
      </div>
    </main>
  )
}
