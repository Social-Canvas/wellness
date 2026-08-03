import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { MemberLiveSessionCard } from "@/features/live-sessions/components/LiveSessionCards"
import { listUpcomingLiveSessionsForMembers } from "@/features/live-sessions/services/live-sessions.service"

export const metadata = {
  title: "Live Sessions",
  description: "Upcoming Elevate live online sessions.",
}

export default async function MemberLiveSessionsPage() {
  const profile = await getCurrentProfile()
  if (!profile.success) {
    return (
      <div className="rounded-2xl border border-line bg-surface px-6 py-6">
        <p className="text-sm text-destructive">{profile.error.message}</p>
      </div>
    )
  }

  const result = await listUpcomingLiveSessionsForMembers(profile.data.id)

  if (!result.success) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl text-ink">Live Sessions</h1>
        <p className="text-sm text-ink-soft">{result.error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Live Sessions</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Weekly live online sessions shared across Elevate memberships. Join opens
          shortly before start. Recordings appear in the shared archive after
          completion when published.
        </p>
      </div>
      {result.data.length === 0 ? (
        <p className="text-sm text-ink-soft">No upcoming sessions yet.</p>
      ) : (
        <div className="grid gap-4">
          {result.data.map((session) => (
            <MemberLiveSessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  )
}
