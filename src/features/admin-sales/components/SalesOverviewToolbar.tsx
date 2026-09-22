"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Download, RefreshCw } from "lucide-react"

import { Button, Input, Label, buttonVariants } from "@/components/ui"
import type { SalesDateRangePreset, SalesOverviewSnapshot } from "@/features/admin-sales/types"
import { cn } from "@/lib/utils"

const RANGE_OPTIONS: Array<{ value: SalesDateRangePreset; label: string }> = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom range" },
]

type SalesOverviewToolbarProps = {
  snapshot: SalesOverviewSnapshot
  from?: string
  to?: string
}

function dateRangeToSearchParams(range: {
  preset: SalesDateRangePreset
  from?: string
  to?: string
}): URLSearchParams {
  const params = new URLSearchParams()
  if (range.preset !== "all") {
    params.set("range", range.preset)
  }
  if (range.preset === "custom") {
    if (range.from) {
      params.set("from", range.from)
    }
    if (range.to) {
      params.set("to", range.to)
    }
  }
  return params
}

function buildHref(next: {
  preset: SalesDateRangePreset
  from?: string
  to?: string
}): string {
  const params = dateRangeToSearchParams(next)
  const query = params.toString()
  return query ? `/admin?${query}` : "/admin"
}

function buildExportHref(
  format: "csv" | "xlsx",
  preset: SalesDateRangePreset,
  from?: string,
  to?: string
): string {
  const params = dateRangeToSearchParams({ preset, from, to })
  params.set("format", format)
  return `/api/admin/sales-overview/export?${params.toString()}`
}

function formatLocalYmd(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/** Inclusive last-30-days defaults for empty custom From/To fields. */
function defaultCustomFromTo(): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 29)
  return { from: formatLocalYmd(from), to: formatLocalYmd(to) }
}

export function SalesOverviewToolbar({
  snapshot,
  from,
  to,
}: SalesOverviewToolbarProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const preset = snapshot.dateRange.preset
  const [isCustomOpen, setIsCustomOpen] = useState(preset === "custom")
  const [customFrom, setCustomFrom] = useState(from ?? "")
  const [customTo, setCustomTo] = useState(to ?? "")

  const showCustomControls = preset === "custom" || isCustomOpen

  function refresh() {
    startTransition(() => {
      router.refresh()
    })
  }

  function openCustomRange() {
    setIsCustomOpen(true)
    if (!customFrom || !customTo) {
      const defaults = defaultCustomFromTo()
      if (!customFrom) {
        setCustomFrom(defaults.from)
      }
      if (!customTo) {
        setCustomTo(defaults.to)
      }
    }
  }

  function selectPreset(next: SalesDateRangePreset) {
    if (next === "custom") {
      openCustomRange()
      return
    }
    setIsCustomOpen(false)
    startTransition(() => {
      router.push(buildHref({ preset: next }))
    })
  }

  function applyCustomRange() {
    if (!customFrom || !customTo) {
      return
    }
    setIsCustomOpen(true)
    startTransition(() => {
      router.push(
        buildHref({
          preset: "custom",
          from: customFrom,
          to: customTo,
        })
      )
    })
  }

  function isPresetSelected(option: SalesDateRangePreset): boolean {
    if (showCustomControls) {
      return option === "custom"
    }
    return preset === option
  }

  const exportCsv = buildExportHref("csv", preset, from, to)
  const exportXlsx = buildExportHref("xlsx", preset, from, to)
  const lastUpdated = snapshot.generatedAt

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">
            Date range
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((option) => {
              const selected = isPresetSelected(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={isPending}
                  onClick={() => selectPreset(option.value)}
                  className={cn(
                    "rounded-[30px] border px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-50",
                    selected
                      ? "border-blue bg-blue-soft text-blue-deep"
                      : "border-line bg-surface text-ink-soft hover:border-blue/40 hover:text-ink"
                  )}
                  aria-pressed={selected}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={refresh}
          >
            <RefreshCw
              className={cn("size-3.5", isPending && "animate-spin")}
              data-icon="inline-start"
            />
            {isPending ? "Refreshing…" : "Refresh"}
          </Button>
          <a
            href={exportCsv}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Download className="size-3.5" data-icon="inline-start" />
            Download CSV
          </a>
          <a
            href={exportXlsx}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Download className="size-3.5" data-icon="inline-start" />
            Download Excel
          </a>
        </div>
      </div>

      {showCustomControls ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="sales-from">From</Label>
            <Input
              id="sales-from"
              type="date"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sales-to">To</Label>
            <Input
              id="sales-to"
              type="date"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={isPending || !customFrom || !customTo}
            onClick={applyCustomRange}
          >
            Apply range
          </Button>
        </div>
      ) : null}

      <p className="text-xs text-ink-soft">
        Showing <span className="font-semibold text-ink">{snapshot.dateRange.label}</span>
        {" · "}
        Last updated{" "}
        <time dateTime={lastUpdated}>
          {new Date(lastUpdated).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </time>
      </p>
    </div>
  )
}
