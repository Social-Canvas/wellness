import type { LeadType } from "@/features/leads/schemas/submit-lead"
import type {
  LeadStatus,
  LeadStatusFilter,
  LeadTypeFilter,
} from "@/features/leads/types"

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  vip: "VIP",
  retreat: "Retreat",
  private_event: "Private Event",
  free_taster: "Free Taster",
  nonprofit: "Nonprofit",
  contact: "Contact",
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  closed: "Closed",
}

/** Inbox type chips (excludes unused `contact` until a public path exists). */
export const ADMIN_LEAD_TYPE_FILTERS: ReadonlyArray<{
  value: LeadTypeFilter
  label: string
}> = [
  { value: "all", label: "All" },
  { value: "retreat", label: "Retreat" },
  { value: "nonprofit", label: "Nonprofit" },
  { value: "vip", label: "VIP" },
  { value: "private_event", label: "Private Event" },
  { value: "free_taster", label: "Free Taster" },
]

export const ADMIN_LEAD_STATUS_FILTERS: ReadonlyArray<{
  value: LeadStatusFilter
  label: string
}> = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "closed", label: "Closed" },
]

export function formatLeadTypeLabel(leadType: string): string {
  if (leadType in LEAD_TYPE_LABELS) {
    return LEAD_TYPE_LABELS[leadType as LeadType]
  }
  return leadType
}

export function formatLeadStatusLabel(status: string): string {
  if (status in LEAD_STATUS_LABELS) {
    return LEAD_STATUS_LABELS[status as LeadStatus]
  }
  return status
}

export function previewLeadMessage(
  message: string | null | undefined,
  maxLength = 80
): string {
  const trimmed = message?.trim()
  if (!trimmed) {
    return "—"
  }
  if (trimmed.length <= maxLength) {
    return trimmed
  }
  return `${trimmed.slice(0, maxLength - 1)}…`
}

export function formatLeadSubmittedAt(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
