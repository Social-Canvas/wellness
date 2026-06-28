import { Badge } from "@/components/ui"
import type { Plan } from "@/features/plans/types"

interface PlanStatusBadgeProps {
  plan: Pick<Plan, "is_active">
}

export function PlanStatusBadge({ plan }: PlanStatusBadgeProps) {
  if (plan.is_active) {
    return <Badge variant="plan">Active</Badge>
  }

  return <Badge variant="outline">Archived</Badge>
}
