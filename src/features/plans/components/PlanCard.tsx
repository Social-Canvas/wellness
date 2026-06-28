import type { ReactNode } from "react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui"
import type { BillingInterval, PlanPrice, PlanWithPrices } from "@/features/plans/types"

import { PlanStatusBadge } from "./PlanStatusBadge"

function getPlanPrice(
  plan: PlanWithPrices,
  interval: BillingInterval
): PlanPrice | undefined {
  return plan.prices.find(
    (price) => price.billing_interval === interval && price.is_active
  )
}

function formatPlanPrice(price: PlanPrice | undefined): string {
  if (!price) {
    return "—"
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: price.currency.toUpperCase(),
  }).format(price.amount / 100)
}

interface PlanCardProps {
  plan: PlanWithPrices
  actions?: ReactNode
}

export function PlanCard({ plan, actions }: PlanCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="font-display text-lg font-medium">
            {plan.name}
          </CardTitle>
          <p className="mt-1 text-sm text-ink-soft">{plan.slug}</p>
        </div>
        <PlanStatusBadge plan={plan} />
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-ink-soft">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Monthly
            </p>
            <p className="mt-1 font-medium text-ink">
              {formatPlanPrice(getPlanPrice(plan, "monthly"))}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Yearly
            </p>
            <p className="mt-1 font-medium text-ink">
              {formatPlanPrice(getPlanPrice(plan, "yearly"))}
            </p>
          </div>
        </div>
        <p>
          <span className="font-semibold text-ink">Sort order:</span>{" "}
          {plan.sort_order}
        </p>
        {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
      </CardContent>
    </Card>
  )
}

export { formatPlanPrice, getPlanPrice }
