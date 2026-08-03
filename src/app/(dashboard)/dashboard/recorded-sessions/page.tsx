import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { LibraryPageHeader } from "@/features/content/components"
import { RecordedSessionsArchive } from "@/features/recorded-sessions/components"
import { listPublishedRecordedSessionsForMember } from "@/features/recorded-sessions/services/recorded-sessions.service"
import { canAccessRecordedSessions } from "@/server/services/entitlement.service"

export const metadata: Metadata = {
  title: "Recorded Sessions",
  description: "Watch the shared Elevate membership recorded sessions archive.",
}

export default async function RecordedSessionsPage() {
  const profileResult = await getCurrentProfile()
  if (!profileResult.success) {
    redirect("/login")
  }

  const access = await canAccessRecordedSessions(profileResult.data.id)
  if (!access.success) {
    return (
      <div className="mt-9 space-y-6">
        <LibraryPageHeader
          breadcrumb={[{ label: "Recorded Sessions" }]}
          title="Recorded Sessions"
        />
        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{access.error.message}</p>
        </div>
      </div>
    )
  }

  if (!access.data) {
    return (
      <div className="mt-9 space-y-6">
        <LibraryPageHeader
          breadcrumb={[{ label: "Recorded Sessions" }]}
          title="Recorded Sessions"
          description="Weekly Elevate membership session recordings."
        />
        <div className="rounded-2xl border border-line bg-surface px-6 py-8">
          <p className="font-display text-xl font-medium text-ink">
            Membership required
          </p>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">
            Recorded sessions are included with active Elevate memberships
            (Core, Gold, Platinum, nonprofit-sponsored, and complimentary). Reset
            and ebook purchases alone do not unlock this library.
          </p>
        </div>
      </div>
    )
  }

  const sessionsResult = await listPublishedRecordedSessionsForMember(
    profileResult.data.id
  )

  if (!sessionsResult.success) {
    return (
      <div className="mt-9 space-y-6">
        <LibraryPageHeader
          breadcrumb={[{ label: "Recorded Sessions" }]}
          title="Recorded Sessions"
        />
        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{sessionsResult.error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-9 space-y-8">
      <LibraryPageHeader
        breadcrumb={[{ label: "Recorded Sessions" }]}
        title="Recorded Sessions"
        description="A growing weekly archive shared across all active Elevate memberships."
      />
      {sessionsResult.data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-cream2/40 px-6 py-10 text-center">
          <p className="font-display text-lg font-medium text-ink">
            Sessions coming soon
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            New membership recordings will appear here as they are published.
          </p>
        </div>
      ) : (
        <RecordedSessionsArchive sessions={sessionsResult.data} />
      )}
    </div>
  )
}
