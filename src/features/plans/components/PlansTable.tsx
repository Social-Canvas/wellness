"use client"

import { useState } from "react"

import {
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui"
import type { PlanWithPrices } from "@/features/plans/types"

import { ArchivePlanDialog } from "./ArchivePlanDialog"
import { CreatePlanDialog } from "./CreatePlanDialog"
import { EditPlanDialog } from "./EditPlanDialog"
import { formatPlanPrice, getPlanPrice, PlanCard } from "./PlanCard"
import { PlanStatusBadge } from "./PlanStatusBadge"

interface PlansTableProps {
  plans: PlanWithPrices[]
}

function PlanRowActions({
  plan,
  onEdit,
  onArchive,
}: {
  plan: PlanWithPrices
  onEdit: (plan: PlanWithPrices) => void
  onArchive: (plan: PlanWithPrices) => void
}) {
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => onEdit(plan)}>
        Edit
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={!plan.is_active}
        onClick={() => onArchive(plan)}
      >
        Archive
      </Button>
    </>
  )
}

export function PlansTable({ plans }: PlansTableProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editPlan, setEditPlan] = useState<PlanWithPrices | null>(null)
  const [archivePlan, setArchivePlan] = useState<PlanWithPrices | null>(null)

  if (plans.length === 0) {
    return (
      <>
        <div className="rounded-2xl border border-dashed border-line bg-cream2/50 px-6 py-10 text-center">
          <p className="font-display text-lg font-medium text-ink">No plans yet</p>
          <p className="mt-2 text-sm text-ink-soft">
            Create your first membership plan to get started.
          </p>
          <div className="mt-5">
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Create plan
            </Button>
          </div>
        </div>

        <CreatePlanDialog open={createOpen} onOpenChange={setCreateOpen} />
      </>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          {plans.length} plan{plans.length === 1 ? "" : "s"}
        </p>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Create plan
        </Button>
      </div>

      <Card className="mt-4 hidden lg:block">
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Monthly Price</TableHead>
                <TableHead>Yearly Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell className="text-ink-soft">{plan.slug}</TableCell>
                  <TableCell>
                    {formatPlanPrice(getPlanPrice(plan, "monthly"))}
                  </TableCell>
                  <TableCell>
                    {formatPlanPrice(getPlanPrice(plan, "yearly"))}
                  </TableCell>
                  <TableCell>
                    <PlanStatusBadge plan={plan} />
                  </TableCell>
                  <TableCell>{plan.sort_order}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <PlanRowActions
                        plan={plan}
                        onEdit={setEditPlan}
                        onArchive={setArchivePlan}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:hidden">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            actions={
              <PlanRowActions
                plan={plan}
                onEdit={setEditPlan}
                onArchive={setArchivePlan}
              />
            }
          />
        ))}
      </div>

      <CreatePlanDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditPlanDialog
        plan={editPlan}
        open={Boolean(editPlan)}
        onOpenChange={(open) => {
          if (!open) {
            setEditPlan(null)
          }
        }}
      />
      <ArchivePlanDialog
        plan={archivePlan}
        open={Boolean(archivePlan)}
        onOpenChange={(open) => {
          if (!open) {
            setArchivePlan(null)
          }
        }}
      />
    </>
  )
}
