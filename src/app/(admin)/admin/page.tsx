import type { Metadata } from "next"

import {
  SalesOverviewDashboard,
  SalesOverviewToolbar,
} from "@/features/admin-sales/components"
import { getSalesOverview } from "@/features/admin-sales/services/sales-overview.service"
import { parseSalesOverviewSearchParams } from "@/features/admin-sales/utils/parse-search-params"

export const metadata: Metadata = {
  title: "Admin · Sales & Membership",
  robots: { index: false, follow: false },
}

type AdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams
  const query = parseSalesOverviewSearchParams(params)
  const result = await getSalesOverview(query)

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-[28px] font-medium text-ink">
            Sales &amp; Membership Overview
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Business numbers for Elevate sales and memberships.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{result.error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <SalesOverviewDashboard
      snapshot={result.data}
      toolbar={
        <SalesOverviewToolbar
          snapshot={result.data}
          from={query.from}
          to={query.to}
        />
      }
    />
  )
}
