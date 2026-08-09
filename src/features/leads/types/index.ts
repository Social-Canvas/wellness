import type { LeadType } from "@/features/leads/schemas/submit-lead"
import type { Database } from "@/types/database/supabase"

export type LeadStatus = Database["public"]["Enums"]["lead_status"]

export type LeadListItem = {
  id: string
  createdAt: string
  leadType: LeadType
  name: string
  email: string
  phone: string | null
  organizationName: string | null
  estimatedParticipants: string | null
  interest: string | null
  message: string | null
  status: LeadStatus
  source: string | null
}

export type LeadDetail = LeadListItem & {
  metadata: Record<string, unknown>
  notificationStatus: Database["public"]["Enums"]["lead_notification_status"]
  visitorAckStatus: Database["public"]["Enums"]["lead_notification_status"]
  lastNotificationError: string | null
  updatedAt: string
  ghlSyncStatus: Database["public"]["Enums"]["ghl_sync_status"]
}

export type LeadTypeFilter =
  | "all"
  | "vip"
  | "retreat"
  | "private_event"
  | "nonprofit"
  | "free_taster"

export type LeadStatusFilter = "all" | LeadStatus

export type ListLeadsFilters = {
  type?: LeadTypeFilter
  status?: LeadStatusFilter
}
