import Link from "next/link"

import type { LeadStatusFilter, LeadTypeFilter } from "@/features/leads/types"
import {
  ADMIN_LEAD_STATUS_FILTERS,
  ADMIN_LEAD_TYPE_FILTERS,
} from "@/features/leads/utils/lead-labels"
import { cn } from "@/lib/utils"

type LeadsFiltersProps = {
  type: LeadTypeFilter
  status: LeadStatusFilter
}

function buildHref(next: { type: LeadTypeFilter; status: LeadStatusFilter }) {
  const params = new URLSearchParams()
  if (next.type !== "all") {
    params.set("type", next.type)
  }
  if (next.status !== "all") {
    params.set("status", next.status)
  }
  const query = params.toString()
  return query ? `/admin/leads?${query}` : "/admin/leads"
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-[30px] border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
        active
          ? "border-blue bg-blue-soft text-blue-deep"
          : "border-line bg-surface text-ink-soft hover:border-blue/40 hover:text-ink"
      )}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  )
}

export function LeadsFilters({ type, status }: LeadsFiltersProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">
          Enquiry type
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ADMIN_LEAD_TYPE_FILTERS.map((item) => (
            <FilterChip
              key={item.value}
              href={buildHref({ type: item.value, status })}
              label={item.label}
              active={type === item.value}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">
          Status
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ADMIN_LEAD_STATUS_FILTERS.map((item) => (
            <FilterChip
              key={item.value}
              href={buildHref({ type, status: item.value })}
              label={item.label}
              active={status === item.value}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
