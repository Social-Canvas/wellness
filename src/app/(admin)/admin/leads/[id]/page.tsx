import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { LeadDetailView } from "@/features/leads/components/admin"
import { getLeadById } from "@/features/leads/services/admin-leads.service"

export const metadata: Metadata = {
  title: "Enquiry detail",
}

type AdminLeadDetailPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function AdminLeadDetailPage({
  params,
}: AdminLeadDetailPageProps) {
  const { id } = await params
  const result = await getLeadById(id)

  if (!result.success) {
    if (result.error.code === "not_found") {
      notFound()
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-[28px] font-medium text-ink">
            Enquiry
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Unable to open this enquiry.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{result.error.message}</p>
        </div>
      </div>
    )
  }

  return <LeadDetailView lead={result.data} />
}
