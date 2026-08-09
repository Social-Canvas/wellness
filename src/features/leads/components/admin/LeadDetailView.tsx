import Link from "next/link"

import { Card, CardContent } from "@/components/ui"
import { LeadStatusBadge } from "@/features/leads/components/admin/LeadStatusBadge"
import { LeadStatusSelect } from "@/features/leads/components/admin/LeadStatusSelect"
import type { LeadDetail } from "@/features/leads/types"
import {
  formatLeadSubmittedAt,
  formatLeadTypeLabel,
} from "@/features/leads/utils/lead-labels"

type LeadDetailViewProps = {
  lead: LeadDetail
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  const display = value?.trim()
  return (
    <div className="grid gap-1 border-b border-line py-3 last:border-b-0 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-ink-soft">{label}</dt>
      <dd className="text-sm text-ink whitespace-pre-wrap break-words">
        {display || "—"}
      </dd>
    </div>
  )
}

export function LeadDetailView({ lead }: LeadDetailViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/leads"
            className="text-sm font-semibold text-blue underline-offset-2 hover:underline"
          >
            ← Back to enquiries
          </Link>
          <h2 className="mt-3 font-display text-[28px] font-medium text-ink">
            {lead.name}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {formatLeadTypeLabel(lead.leadType)} ·{" "}
            {formatLeadSubmittedAt(lead.createdAt)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <LeadStatusBadge status={lead.status} />
          <LeadStatusSelect leadId={lead.id} status={lead.status} />
        </div>
      </div>

      <Card>
        <CardContent className="px-6 py-2">
          <dl>
            <DetailRow label="Submitted" value={formatLeadSubmittedAt(lead.createdAt)} />
            <DetailRow label="Enquiry type" value={formatLeadTypeLabel(lead.leadType)} />
            <DetailRow label="Name" value={lead.name} />
            <DetailRow label="Email" value={lead.email} />
            <DetailRow label="Phone" value={lead.phone} />
            <DetailRow label="Organization" value={lead.organizationName} />
            <DetailRow
              label="Estimated participants"
              value={lead.estimatedParticipants}
            />
            <DetailRow label="Interest" value={lead.interest} />
            <DetailRow label="Source" value={lead.source} />
            <DetailRow label="Message" value={lead.message} />
            <DetailRow label="Notification" value={lead.notificationStatus} />
            <DetailRow label="Visitor acknowledgement" value={lead.visitorAckStatus} />
            <DetailRow
              label="Last notification note"
              value={lead.lastNotificationError}
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
