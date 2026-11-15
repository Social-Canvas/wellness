import { BotReviewTable } from "@/features/bot-protection/components/bot-review-table"
import {
  buildBotDryRunReport,
  listBotReviewRows,
} from "@/features/bot-protection/services/bot-review.service"

export const metadata = {
  title: "Bot review",
  robots: { index: false, follow: false },
}

export default async function AdminBotsPage() {
  const [rowsResult, dryRunResult] = await Promise.all([
    listBotReviewRows(),
    buildBotDryRunReport(),
  ])

  if (!rowsResult.success) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-[28px] font-medium text-ink">Bot review</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Review suspected bots. Flagging never deletes accounts or enquiries.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{rowsResult.error.message}</p>
        </div>
      </div>
    )
  }

  const dryRun = dryRunResult.success ? dryRunResult.data : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[28px] font-medium text-ink">Bot review</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Dry-run only unless you flag a single record. Existing production rows
          are never bulk-updated by this page.
        </p>
      </div>

      {dryRun ? (
        <div className="rounded-2xl border border-line bg-surface px-6 py-5 text-sm text-ink">
          <p className="font-semibold">Dry-run report (no writes)</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            <li>Accounts scanned: {dryRun.profiles.total}</li>
            <li>Enquiries scanned: {dryRun.leads.total}</li>
            <li>Accounts already flagged: {dryRun.profiles.alreadyFlagged}</li>
            <li>Enquiries already flagged: {dryRun.leads.alreadyFlagged}</li>
            <li>
              Safe auto-flag account IDs: {dryRun.profiles.autoFlagSafeIds.length}
            </li>
            <li>Safe auto-flag enquiry IDs: {dryRun.leads.autoFlagSafeIds.length}</li>
            <li>Manual review accounts: {dryRun.profiles.manualReviewIds.length}</li>
            <li>Manual review enquiries: {dryRun.leads.manualReviewIds.length}</li>
          </ul>
          <p className="mt-3 text-ink-soft">
            High-confidence auto-flag is limited to internal test/E2E patterns.
            Repeated retreat emails stay in manual review.
          </p>
        </div>
      ) : null}

      <BotReviewTable rows={rowsResult.data} />
    </div>
  )
}
