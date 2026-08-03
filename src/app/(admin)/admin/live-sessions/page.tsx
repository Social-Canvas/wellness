import { listLiveSessionsAdmin } from "@/features/live-sessions/services/live-sessions.service"
import { LiveSessionsAdminTable } from "@/features/live-sessions/components/LiveSessionsAdminTable"

export default async function AdminLiveSessionsPage() {
  const result = await listLiveSessionsAdmin()

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-[28px] font-medium text-ink">
            Live Sessions
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Schedule weekly Zoom sessions shared by all memberships.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{result.error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[28px] font-medium text-ink">
          Live Sessions
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          One shared weekly schedule for Core, Gold, Platinum, and nonprofit-sponsored
          Core-equivalent access. Zoom host URLs never appear in public HTML.
        </p>
      </div>
      <LiveSessionsAdminTable sessions={result.data} />
    </div>
  )
}
