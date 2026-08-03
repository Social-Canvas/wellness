import { listRecordedSessionsAdmin } from "@/features/recorded-sessions/services/recorded-sessions.service"
import { RecordedSessionsAdminTable } from "@/features/recorded-sessions/components"

export default async function AdminRecordedSessionsPage() {
  const result = await listRecordedSessionsAdmin()

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-[28px] font-medium text-ink">
            Recorded Sessions
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Manage the shared Elevate membership session archive.
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
          Recorded Sessions
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Draft, link existing Mux assets, preview readiness, and publish weekly
          without redeploying.
        </p>
      </div>
      <RecordedSessionsAdminTable sessions={result.data} />
    </div>
  )
}
