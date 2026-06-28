import { listPlans } from "@/features/plans/services/plans.service"
import { PlansTable } from "@/features/plans/components"

export default async function AdminPlansPage() {
  const result = await listPlans()

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-[28px] font-medium text-ink">Plans</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Manage membership plans and pricing visibility.
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
        <h2 className="font-display text-[28px] font-medium text-ink">Plans</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Manage membership plans and pricing visibility.
        </p>
      </div>

      <PlansTable plans={result.data} />
    </div>
  )
}
