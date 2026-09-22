import type { ReactNode } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui"
import type { SalesMetricCard, SalesOverviewSnapshot } from "@/features/admin-sales/types"
import { cn } from "@/lib/utils"

function formatCents(cents: number, currency: string = "usd"): string {
  const code = currency.trim().toUpperCase() || "USD"
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
    }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${code}`
  }
}

function MetricCard({ metric }: { metric: SalesMetricCard }) {
  return (
    <Card size="sm" className="bg-surface">
      <CardHeader className="gap-1">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-display text-base font-medium text-ink">
            {metric.label}
          </CardTitle>
          <span
            className="inline-flex size-5 shrink-0 cursor-help items-center justify-center rounded-full border border-line text-[11px] font-bold text-ink-soft"
            title={metric.tooltip}
            aria-label={metric.tooltip}
          >
            ?
          </span>
        </div>
        {metric.note ? (
          <CardDescription className="text-[12px] text-ink-soft">
            {metric.note}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            "font-display text-3xl font-medium tracking-tight text-ink",
            metric.reliability === "unavailable" && "text-ink-soft"
          )}
        >
          {metric.displayValue}
        </p>
        {metric.reliability === "partial" ? (
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-amber-800">
            Partial — see note
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

type SalesOverviewDashboardProps = {
  snapshot: SalesOverviewSnapshot
  toolbar: ReactNode
}

export function SalesOverviewDashboard({
  snapshot,
  toolbar,
}: SalesOverviewDashboardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[28px] font-medium text-ink">
          Sales &amp; Membership Overview
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-ink-soft">
          Business numbers from Elevate customer accounts, paid product checkouts,
          and current memberships. Refresh on demand or export the filtered view.
        </p>
      </div>

      {toolbar}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {snapshot.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg font-medium">
              Purchases by product
            </CardTitle>
            <CardDescription>
              Paid one-time purchases in the selected date range. Revenue uses
              Stripe-synced order amounts.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {snapshot.purchasesByProduct.length === 0 ? (
              <p className="text-sm text-ink-soft">No paid product purchases in this range.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.purchasesByProduct.map((row) => (
                    <TableRow key={row.productId}>
                      <TableCell className="font-medium text-ink">
                        {row.productName}
                      </TableCell>
                      <TableCell>{row.purchaseCount}</TableCell>
                      <TableCell>
                        {formatCents(row.revenueCents, row.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg font-medium">
              Memberships by tier
            </CardTitle>
            <CardDescription>
              Current active personal memberships and sponsored seats (not a
              historical date-range reconstruction).
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {snapshot.membershipsByTier.length === 0 ? (
              <p className="text-sm text-ink-soft">No active memberships right now.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tier</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.membershipsByTier.map((row) => (
                    <TableRow key={row.tierKey}>
                      <TableCell className="font-medium text-ink">
                        {row.tierLabel}
                      </TableCell>
                      <TableCell>{row.activeCount}</TableCell>
                      <TableCell className="capitalize text-ink-soft">
                        {row.source === "personal_stripe"
                          ? "Personal"
                          : row.source === "sponsored"
                            ? "Sponsored"
                            : "Mixed"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg font-medium">
            Recent sales
          </CardTitle>
          <CardDescription>
            Recent paid product checkouts and membership activations in range.
            Membership amounts are not stored locally after checkout — renewals
            live in Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {snapshot.recentSales.length === 0 ? (
            <p className="text-sm text-ink-soft">No sales in this range.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product / plan</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.recentSales.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium text-ink">
                        {row.customerName?.trim() || "—"}
                      </div>
                      <div className="text-xs text-ink-soft">{row.customerEmail}</div>
                    </TableCell>
                    <TableCell>{row.productOrPlan}</TableCell>
                    <TableCell>
                      {row.type === "one_time" ? "One-time" : "Membership"}
                    </TableCell>
                    <TableCell>
                      {row.amountCents === null
                        ? "See Stripe"
                        : formatCents(row.amountCents, row.currency ?? "usd")}
                    </TableCell>
                    <TableCell>
                      {new Date(row.occurredAt).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </TableCell>
                    <TableCell className="capitalize">{row.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-dashed border-line bg-cream2/40 px-5 py-4 text-sm text-ink-soft">
        <p className="font-semibold text-ink">Data notes</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {snapshot.limitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
          <li>{snapshot.exclusionSummary}</li>
        </ul>
      </div>
    </div>
  )
}
