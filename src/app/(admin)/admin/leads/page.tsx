import type { Metadata } from "next"

import {
  LeadsFilters,
  LeadsTable,
} from "@/features/leads/components/admin"
import { listLeads } from "@/features/leads/services/admin-leads.service"
import type { LeadStatusFilter, LeadTypeFilter } from "@/features/leads/types"
import {
  ADMIN_LEAD_STATUS_FILTERS,
  ADMIN_LEAD_TYPE_FILTERS,
} from "@/features/leads/utils/lead-labels"

export const metadata: Metadata = {
  title: "Enquiries",
}

type AdminLeadsPageProps = {
  searchParams: Promise<{
    type?: string
    status?: string
  }>
}

function parseTypeFilter(value: string | undefined): LeadTypeFilter {
  const match = ADMIN_LEAD_TYPE_FILTERS.find((item) => item.value === value)
  return match?.value ?? "all"
}

function parseStatusFilter(value: string | undefined): LeadStatusFilter {
  const match = ADMIN_LEAD_STATUS_FILTERS.find((item) => item.value === value)
  return match?.value ?? "all"
}

export default async function AdminLeadsPage({
  searchParams,
}: AdminLeadsPageProps) {
  const params = await searchParams
  const type = parseTypeFilter(params.type)
  const status = parseStatusFilter(params.status)

  const result = await listLeads({ type, status })

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-[28px] font-medium text-ink">
            Enquiries
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Review and update public enquiry submissions.
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
          Enquiries
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Inbox for retreat, nonprofit, VIP, private event, and free taster
          enquiries. Type and status filters are independent.
        </p>
      </div>

      <LeadsFilters type={type} status={status} />
      <LeadsTable leads={result.data} />
    </div>
  )
}
