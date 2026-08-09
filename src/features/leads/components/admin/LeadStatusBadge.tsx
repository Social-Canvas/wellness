import { Badge } from "@/components/ui"
import type { LeadStatus } from "@/features/leads/types"
import { formatLeadStatusLabel } from "@/features/leads/utils/lead-labels"

function statusBadgeVariant(
  status: LeadStatus
): "default" | "plan" | "outline" | "secondary" {
  if (status === "new") {
    return "default"
  }
  if (status === "contacted") {
    return "plan"
  }
  if (status === "qualified") {
    return "secondary"
  }
  return "outline"
}

type LeadStatusBadgeProps = {
  status: LeadStatus
}

export function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  return (
    <Badge variant={statusBadgeVariant(status)} size="sm">
      {formatLeadStatusLabel(status)}
    </Badge>
  )
}
