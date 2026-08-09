import "server-only"

import type { ActionResult } from "@/features/auth/services/auth.service"
import { getCurrentUser } from "@/features/auth/services/auth.service"
import type { AuthSessionUser, UserRole } from "@/features/auth/types"
import {
  updateLeadStatusSchema,
  type UpdateLeadStatusInput,
} from "@/features/leads/schemas/update-lead-status"
import type { LeadType } from "@/features/leads/schemas/submit-lead"
import type {
  LeadDetail,
  LeadListItem,
  LeadStatus,
  ListLeadsData,
  ListLeadsFilters,
} from "@/features/leads/types"
import {
  isMissingLeadsSchemaError,
  LEADS_SCHEMA_NOT_READY_MESSAGE,
} from "@/features/leads/utils/leads-schema-errors"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  logger,
  providerErrorFields,
  safeErrorMessage,
} from "@/server/utils/logger"
import type { Database, Json } from "@/types/database/supabase"

type LeadRow = Database["public"]["Tables"]["leads"]["Row"]

const ADMIN_ROLES = new Set<UserRole>(["admin", "super_admin"])

const LIST_SELECT =
  "id, created_at, lead_type, name, email, phone, organization_name, estimated_participants, interest, message, status, source" as const

/** Pre-hardening columns only — safe when migration is not applied. */
const LEGACY_LIST_SELECT =
  "id, created_at, lead_type, name, email, phone, message, source, metadata" as const

const DETAIL_SELECT =
  "id, created_at, updated_at, lead_type, name, email, phone, organization_name, estimated_participants, interest, message, status, source, metadata, notification_status, visitor_ack_status, last_notification_error, ghl_sync_status" as const

const LEGACY_DETAIL_SELECT =
  "id, created_at, updated_at, lead_type, name, email, phone, message, source, metadata, ghl_sync_status" as const

type LegacyListRow = {
  id: string
  created_at: string
  lead_type: LeadRow["lead_type"]
  name: string
  email: string
  phone: string | null
  message: string | null
  source: string | null
  metadata: Json
}

type LegacyDetailRow = LegacyListRow & {
  updated_at: string
  ghl_sync_status: LeadRow["ghl_sync_status"]
}

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

function validationFailure(message: string): ActionResult<never> {
  return failure("validation_error", message)
}

function firstValidationMessage(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Invalid input."
}

async function requireAdminActor(): Promise<ActionResult<AuthSessionUser>> {
  const actorResult = await getCurrentUser()

  if (!actorResult.success) {
    return actorResult
  }

  if (!ADMIN_ROLES.has(actorResult.data.role)) {
    return failure("forbidden", "You do not have permission to manage enquiries.")
  }

  return actorResult
}

function metadataRecord(value: Json): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function metadataString(
  metadata: Record<string, unknown>,
  key: string
): string | null {
  const value = metadata[key]
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function mapListItem(row: Pick<
  LeadRow,
  | "id"
  | "created_at"
  | "lead_type"
  | "name"
  | "email"
  | "phone"
  | "organization_name"
  | "estimated_participants"
  | "interest"
  | "message"
  | "status"
  | "source"
>): LeadListItem {
  return {
    id: row.id,
    createdAt: row.created_at,
    leadType: row.lead_type as LeadType,
    name: row.name,
    email: row.email,
    phone: row.phone,
    organizationName: row.organization_name,
    estimatedParticipants: row.estimated_participants,
    interest: row.interest,
    message: row.message,
    status: row.status,
    source: row.source,
  }
}

function mapLegacyListItem(row: LegacyListRow): LeadListItem {
  const metadata = metadataRecord(row.metadata)
  return {
    id: row.id,
    createdAt: row.created_at,
    leadType: row.lead_type as LeadType,
    name: row.name,
    email: row.email,
    phone: row.phone,
    organizationName: metadataString(metadata, "organizationName"),
    estimatedParticipants: metadataString(metadata, "estimatedParticipants"),
    interest: metadataString(metadata, "interest"),
    message: row.message,
    status: "new",
    source: row.source,
  }
}

function mapDetail(row: LeadRow): LeadDetail {
  return {
    ...mapListItem(row),
    metadata: metadataRecord(row.metadata),
    notificationStatus: row.notification_status,
    visitorAckStatus: row.visitor_ack_status,
    lastNotificationError: row.last_notification_error,
    updatedAt: row.updated_at,
    ghlSyncStatus: row.ghl_sync_status,
  }
}

function mapLegacyDetail(row: LegacyDetailRow): LeadDetail {
  return {
    ...mapLegacyListItem(row),
    metadata: metadataRecord(row.metadata),
    notificationStatus: "pending",
    visitorAckStatus: "pending",
    lastNotificationError: null,
    updatedAt: row.updated_at,
    ghlSyncStatus: row.ghl_sync_status,
  }
}

function logProviderFailure(
  level: "warn" | "error",
  label: string,
  operation: string,
  error: unknown,
  extra?: LogContextSafe
): void {
  const fields = providerErrorFields(error)
  const context = {
    operation,
    code: fields.code,
    message: fields.message,
    details: fields.details,
    hint: fields.hint,
    ...extra,
  }

  if (level === "warn") {
    logger.warn(label, context)
    return
  }

  logger.error(label, context)
}

type LogContextSafe = Record<string, string | number | boolean | null | undefined>

/**
 * Badge helper for admin chrome. Never throws; returns 0 when the enquiry
 * schema is incomplete or the provider fails.
 */
export async function countNewLeads(): Promise<ActionResult<number>> {
  try {
    const actorResult = await requireAdminActor()
    if (!actorResult.success) {
      return success(0)
    }

    const supabase = createAdminClient()
    const { count, error } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "new")

    if (!error) {
      return success(count ?? 0)
    }

    if (isMissingLeadsSchemaError(error)) {
      // Without status, treat all existing leads as unread-ish for the badge.
      const legacy = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })

      if (legacy.error) {
        logProviderFailure(
          "warn",
          "[admin-leads] countNewLeads legacy fallback failed",
          "countNewLeads",
          legacy.error
        )
        return success(0)
      }

      logProviderFailure(
        "warn",
        "[admin-leads] countNewLeads using legacy schema fallback",
        "countNewLeads",
        error
      )
      return success(legacy.count ?? 0)
    }

    logProviderFailure(
      "warn",
      "[admin-leads] countNewLeads failed",
      "countNewLeads",
      error
    )
    return success(0)
  } catch (caughtError) {
    logger.warn("[admin-leads] countNewLeads unexpected error", {
      operation: "countNewLeads",
      error: safeErrorMessage(caughtError),
    })
    return success(0)
  }
}

export async function listLeads(
  filters: ListLeadsFilters = {}
): Promise<ActionResult<ListLeadsData>> {
  const actorResult = await requireAdminActor()
  if (!actorResult.success) {
    return actorResult
  }

  try {
    const supabase = createAdminClient()
    let query = supabase
      .from("leads")
      .select(LIST_SELECT)
      .order("created_at", { ascending: false })
      .limit(200)

    if (filters.type && filters.type !== "all") {
      query = query.eq("lead_type", filters.type)
    }

    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status)
    }

    const { data, error } = await query

    if (!error) {
      return success({
        leads: (data ?? []).map(mapListItem),
        schemaReady: true,
      })
    }

    if (!isMissingLeadsSchemaError(error)) {
      logProviderFailure(
        "error",
        "[admin-leads] listLeads failed",
        "listLeads",
        error
      )
      return failure("provider_error", "Unable to load enquiries. Please try again.")
    }

    logProviderFailure(
      "warn",
      "[admin-leads] listLeads schema not ready; using legacy columns",
      "listLeads",
      error
    )

    let legacyQuery = supabase
      .from("leads")
      .select(LEGACY_LIST_SELECT)
      .order("created_at", { ascending: false })
      .limit(200)

    if (filters.type && filters.type !== "all") {
      legacyQuery = legacyQuery.eq("lead_type", filters.type)
    }

    // Status column does not exist — ignore status filter in legacy mode.
    const legacy = await legacyQuery

    if (legacy.error) {
      logProviderFailure(
        "error",
        "[admin-leads] listLeads legacy fallback failed",
        "listLeads",
        legacy.error
      )
      return failure("schema_not_ready", LEADS_SCHEMA_NOT_READY_MESSAGE)
    }

    let leads = ((legacy.data ?? []) as LegacyListRow[]).map(mapLegacyListItem)

    if (filters.status && filters.status !== "all") {
      leads = leads.filter((lead) => lead.status === filters.status)
    }

    return success({
      leads,
      schemaReady: false,
    })
  } catch (caughtError) {
    logger.error("[admin-leads] listLeads unexpected error", {
      operation: "listLeads",
      error: safeErrorMessage(caughtError),
    })
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function getLeadById(
  leadId: string
): Promise<ActionResult<LeadDetail>> {
  const actorResult = await requireAdminActor()
  if (!actorResult.success) {
    return actorResult
  }

  const id = leadId.trim()
  if (!id) {
    return validationFailure("Enquiry id is required.")
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("leads")
      .select(DETAIL_SELECT)
      .eq("id", id)
      .maybeSingle()

    if (!error) {
      if (!data) {
        return failure("not_found", "Enquiry not found.")
      }
      return success(mapDetail(data as LeadRow))
    }

    if (!isMissingLeadsSchemaError(error)) {
      logProviderFailure(
        "error",
        "[admin-leads] getLeadById failed",
        "getLeadById",
        error
      )
      return failure("provider_error", "Unable to load enquiry. Please try again.")
    }

    logProviderFailure(
      "warn",
      "[admin-leads] getLeadById schema not ready; using legacy columns",
      "getLeadById",
      error
    )

    const legacy = await supabase
      .from("leads")
      .select(LEGACY_DETAIL_SELECT)
      .eq("id", id)
      .maybeSingle()

    if (legacy.error) {
      logProviderFailure(
        "error",
        "[admin-leads] getLeadById legacy fallback failed",
        "getLeadById",
        legacy.error
      )
      return failure("schema_not_ready", LEADS_SCHEMA_NOT_READY_MESSAGE)
    }

    if (!legacy.data) {
      return failure("not_found", "Enquiry not found.")
    }

    return success(mapLegacyDetail(legacy.data as LegacyDetailRow))
  } catch (caughtError) {
    logger.error("[admin-leads] getLeadById unexpected error", {
      operation: "getLeadById",
      error: safeErrorMessage(caughtError),
    })
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function updateLeadStatus(
  input: UpdateLeadStatusInput
): Promise<ActionResult<LeadListItem>> {
  const actorResult = await requireAdminActor()
  if (!actorResult.success) {
    return actorResult
  }

  const parsed = updateLeadStatusSchema.safeParse(input)
  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("leads")
      .update({ status: parsed.data.status as LeadStatus })
      .eq("id", parsed.data.leadId)
      .select(LIST_SELECT)
      .maybeSingle()

    if (error) {
      if (isMissingLeadsSchemaError(error)) {
        logProviderFailure(
          "warn",
          "[admin-leads] updateLeadStatus blocked; schema not ready",
          "updateLeadStatus",
          error,
          { leadId: parsed.data.leadId }
        )
        return failure("schema_not_ready", LEADS_SCHEMA_NOT_READY_MESSAGE)
      }

      logProviderFailure(
        "error",
        "[admin-leads] updateLeadStatus failed",
        "updateLeadStatus",
        error,
        { leadId: parsed.data.leadId }
      )
      return failure("provider_error", "Unable to update enquiry status.")
    }

    if (!data) {
      return failure("not_found", "Enquiry not found.")
    }

    return success(mapListItem(data))
  } catch (caughtError) {
    logger.error("[admin-leads] updateLeadStatus unexpected error", {
      operation: "updateLeadStatus",
      error: safeErrorMessage(caughtError),
    })
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}
