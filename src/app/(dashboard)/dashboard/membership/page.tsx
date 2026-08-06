import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { MembershipHub } from "@/features/dashboard/components/membership-hub"
import { latestRecordingsForHub } from "@/features/dashboard/utils/library-membership"
import {
  getMemberVirtualQuotaView,
  getReservationForLiveClass,
} from "@/features/live-sessions/services/live-session-quota.service"
import { listUpcomingLiveSessionsForMembers } from "@/features/live-sessions/services/live-sessions.service"
import { listPublishedRecordedSessionsForMember } from "@/features/recorded-sessions/services/recorded-sessions.service"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getEffectiveMembership } from "@/server/services/membership.service"

export const metadata: Metadata = {
  title: "Membership",
  description:
    "Your Elevate membership hub — plan status, live sessions, and recordings.",
}

export default async function MembershipPage() {
  const profileResult = await getCurrentProfile()
  if (!profileResult.success) {
    redirect("/login")
  }

  const membershipResult = await getEffectiveMembership(profileResult.data.id)
  if (!membershipResult.success) {
    return (
      <div className="rounded-2xl border border-line bg-surface px-6 py-6">
        <p className="text-sm text-destructive">
          {membershipResult.error.message}
        </p>
      </div>
    )
  }

  const membership = membershipResult.data
  if (
    membership.source === "none" ||
    membership.status === "none" ||
    !membership.effectivePlanId
  ) {
    return (
      <div className="space-y-6" data-membership-hub-empty>
        <div>
          <h1 className="font-display text-[28px] font-medium text-ink">
            Membership
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">
            You do not have an active Elevate membership yet. Browse programs to
            choose a plan, or open My Library for courses you already own.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/programs"
            className={cn(buttonVariants({ variant: "default" }))}
          >
            View programs
          </Link>
          <Link
            href="/dashboard/library"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            My Library
          </Link>
        </div>
      </div>
    )
  }

  const [sessionsResult, recordingsResult, quotaResult] = await Promise.all([
    listUpcomingLiveSessionsForMembers(profileResult.data.id),
    listPublishedRecordedSessionsForMember(profileResult.data.id),
    getMemberVirtualQuotaView(profileResult.data.id),
  ])

  const upcomingSession =
    sessionsResult.success && sessionsResult.data.length > 0
      ? sessionsResult.data[0]!
      : null

  const latestRecordings = recordingsResult.success
    ? latestRecordingsForHub(recordingsResult.data, 3)
    : []

  const virtualQuota = quotaResult.success ? quotaResult.data : null

  const reservationResult =
    upcomingSession != null
      ? await getReservationForLiveClass(
          profileResult.data.id,
          upcomingSession.id
        )
      : null

  const reservation =
    reservationResult && reservationResult.success
      ? reservationResult.data
      : null

  return (
    <MembershipHub
      membership={membership}
      upcomingSession={upcomingSession}
      latestRecordings={latestRecordings}
      virtualQuota={virtualQuota}
      reservation={reservation}
    />
  )
}
