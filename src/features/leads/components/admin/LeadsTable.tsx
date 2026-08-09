import Link from "next/link"

import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui"
import { LeadStatusBadge } from "@/features/leads/components/admin/LeadStatusBadge"
import { LeadStatusSelect } from "@/features/leads/components/admin/LeadStatusSelect"
import type { LeadListItem } from "@/features/leads/types"
import {
  formatLeadSubmittedAt,
  formatLeadTypeLabel,
  previewLeadMessage,
} from "@/features/leads/utils/lead-labels"

type LeadsTableProps = {
  leads: LeadListItem[]
}

export function LeadsTable({ leads }: LeadsTableProps) {
  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-cream2/50 px-6 py-10 text-center">
        <p className="font-display text-lg font-medium text-ink">No enquiries</p>
        <p className="mt-2 text-sm text-ink-soft">
          No enquiries match the current filters.
        </p>
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Submitted</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="whitespace-nowrap text-ink-soft">
                    <Link
                      href={`/admin/leads/${lead.id}`}
                      className="font-medium text-blue underline-offset-2 hover:underline"
                    >
                      {formatLeadSubmittedAt(lead.createdAt)}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-ink">
                    {formatLeadTypeLabel(lead.leadType)}
                  </TableCell>
                  <TableCell className="font-medium text-ink">
                    <Link
                      href={`/admin/leads/${lead.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {lead.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-ink-soft">{lead.email}</TableCell>
                  <TableCell className="text-ink-soft">
                    {lead.phone?.trim() || "—"}
                  </TableCell>
                  <TableCell className="text-ink-soft">
                    {lead.organizationName?.trim() || "—"}
                  </TableCell>
                  <TableCell className="text-ink-soft">
                    {lead.estimatedParticipants?.trim() || "—"}
                  </TableCell>
                  <TableCell className="text-ink-soft">
                    {lead.interest?.trim() || "—"}
                  </TableCell>
                  <TableCell className="max-w-[220px] text-ink-soft">
                    {previewLeadMessage(lead.message)}
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-[160px] flex-col gap-2">
                      <LeadStatusBadge status={lead.status} />
                      <LeadStatusSelect leadId={lead.id} status={lead.status} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
