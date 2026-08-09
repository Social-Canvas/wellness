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
  ListLeadsFilters,
} from "@/features/leads/types"
import { createAdminClient } from "@/lib/supabase/admin"
import { logger, safeErrorMessage } from "@/server/utils/logger"
import type { Database, Json } from "@/types/database/supabase"

type LeadRow = Database["public"]["Tables"]["leads"]["Row"]

const ADMIN_ROLES = new Set<UserRole>(["admin", "super_admin"])

const LIST_SELECT =
  "id, created_at, lead_type, name, email, phone, organization_name, estimated_participants, interest, message, status, source" as const

const DETAIL_SELECT =
  "id, created_at, updated_at, lead_type, name, email, phone, organization_name, estimated_participants, interest, message, status, source, metadata, notification_status, visitor_ack_status, last_notification_error, ghl_sync_status" as const

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

export async function countNewLeads(): Promise<ActionResult<number>> {
  const actorResult = await requireAdminActor()
  if (!actorResult.success) {
    return actorResult
  }

  try {
    const supabase = createAdminClient()
    const { count, error } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "new")

    if (error) {
      logger.error("[admin-leads] countNewLeads failed", {
        operation: "countNewLeads",
        code: error.code,
        message: error.message,
      })
      return failure("provider_error", "Unable to load enquiry counts.")
    }

    return success(count ?? 0)
  } catch (caughtError) {
    logger.error("[admin-leads] countNewLeads unexpected error", {
      operation: "countNewLeads",
      error: safeErrorMessage(caughtError),
    })
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function listLeads(
  filters: ListLeadsFilters = {}
): Promise<ActionResult<LeadListItem[]>> {
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

    if (error) {
      logger.error("[admin-leads] listLeads failed", {
        operation: "listLeads",
        code: error.code,
        message: error.message,
      })
      return failure("provider_error", "Unable to load enquiries. Please try again.")
    }

    return success((data ?? []).map(mapListItem))
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

    if (error) {
      logger.error("[admin-leads] getLeadById failed", {
        operation: "getLeadById",
        code: error.code,
        message: error.message,
      })
      return failure("provider_error", "Unable to load enquiry. Please try again.")
    }

    if (!data) {
      return failure("not_found", "Enquiry not found.")
    }

    return success(mapDetail(data as LeadRow))
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
      logger.error("[admin-leads] updateLeadStatus failed", {
        operation: "updateLeadStatus",
        code: error.code,
        message: error.message,
        leadId: parsed.data.leadId,
      })
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
