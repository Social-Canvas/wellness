"use client"

import { useMemo, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
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
import { flagBotRecordAction } from "@/features/bot-protection/actions/bot-review.actions"
import type { BotReviewRow } from "@/features/bot-protection/services/bot-review.service"

type FilterValue = "all" | "flagged" | "auto" | "manual" | "profiles" | "leads"

type BotReviewTableProps = {
  rows: BotReviewRow[]
}

export function BotReviewTable({ rows }: BotReviewTableProps) {
  const [filter, setFilter] = useState<FilterValue>("all")
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (filter === "flagged") return row.suspectedBot
      if (filter === "auto") return row.classification.recommendedAction === "auto_flag_safe"
      if (filter === "manual") return row.classification.recommendedAction === "manual_review"
      if (filter === "profiles") return row.targetType === "profile"
      if (filter === "leads") return row.targetType === "lead"
      return true
    })
  }, [filter, rows])

  function handleFlag(row: BotReviewRow, suspected: boolean) {
    setError(null)
    setPendingId(row.id)
    startTransition(async () => {
      const result = await flagBotRecordAction({
        targetType: row.targetType,
        id: row.id,
        suspected,
        reason: suspected
          ? row.classification.reasons.join(",") || "manual_admin_review"
          : null,
      })
      setPendingId(null)
      if (!result.success) {
        setError(result.error.message)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["flagged", "Already flagged"],
            ["auto", "Safe auto-flag (dry-run)"],
            ["manual", "Manual review"],
            ["profiles", "Accounts"],
            ["leads", "Enquiries"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={
              filter === value
                ? "rounded-[30px] border border-blue bg-blue-soft px-3 py-1.5 text-[12.5px] font-semibold text-blue-deep"
                : "rounded-[30px] border border-line bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft hover:text-ink"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-cream2/50 px-6 py-10 text-center">
          <p className="font-display text-lg font-medium text-ink">No matching records</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Reasons</TableHead>
                    <TableHead>Flagged</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={`${row.targetType}:${row.id}`}>
                      <TableCell className="capitalize text-ink">
                        {row.targetType}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-ink-soft">
                        {new Date(row.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-ink-soft">{row.email}</TableCell>
                      <TableCell className="text-ink">{row.displayName ?? "—"}</TableCell>
                      <TableCell className="font-semibold text-ink">
                        {row.classification.class}
                      </TableCell>
                      <TableCell className="max-w-xs text-xs text-ink-soft">
                        {row.classification.reasons.join(", ")}
                      </TableCell>
                      <TableCell>
                        {row.suspectedBot ? (
                          <span className="text-sm font-semibold text-blue-deep">Yes</span>
                        ) : (
                          <span className="text-sm text-ink-soft">No</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isPending && pendingId === row.id}
                          onClick={() => handleFlag(row, !row.suspectedBot)}
                        >
                          {row.suspectedBot ? "Clear flag" : "Flag"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
