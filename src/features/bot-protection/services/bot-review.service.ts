import "server-only"

import type { ActionResult } from "@/features/auth/services/auth.service"
import { getCurrentProfile, getCurrentUser } from "@/features/auth/services/auth.service"
import type { AuthSessionUser, UserRole } from "@/features/auth/types"
import {
  classifyAccount,
  classifyLead,
  type BotClassification,
} from "@/features/bot-protection/utils/classification"
import {
  flagBotRecordSchema,
  type FlagBotRecordInput,
} from "@/features/bot-protection/schemas/flag-bot"
import { createAdminClient } from "@/lib/supabase/admin"
import { logger, safeErrorMessage } from "@/server/utils/logger"
import type { Database } from "@/types/database/supabase"

const ADMIN_ROLES = new Set<UserRole>(["admin", "super_admin"])

type ProfileBotRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  | "id"
  | "email"
  | "full_name"
  | "certificate_name"
  | "role"
  | "created_at"
  | "suspected_bot"
  | "bot_reason"
  | "bot_flagged_at"
>

type LeadBotRow = Pick<
  Database["public"]["Tables"]["leads"]["Row"],
  | "id"
  | "email"
  | "name"
  | "phone"
  | "message"
  | "lead_type"
  | "source"
  | "created_at"
  | "suspected_bot"
  | "bot_reason"
  | "bot_flagged_at"
>

export type BotReviewRow = {
  targetType: "profile" | "lead"
  id: string
  email: string
  displayName: string | null
  createdAt: string
  suspectedBot: boolean
  botReason: string | null
  botFlaggedAt: string | null
  classification: BotClassification
}

export type BotDryRunReport = {
  generatedAt: string
  wroteProduction: false
  profiles: {
    total: number
    alreadyFlagged: number
    autoFlagSafeIds: string[]
    manualReviewIds: string[]
  }
  leads: {
    total: number
    alreadyFlagged: number
    autoFlagSafeIds: string[]
    manualReviewIds: string[]
  }
  notes: string[]
}

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
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
    return failure("forbidden", "You do not have permission to review suspected bots.")
  }
  return actorResult
}

function isMissingBotColumnError(error: { message?: string; code?: string } | null): boolean {
  if (!error?.message) {
    return false
  }
  return /suspected_bot|bot_reason|bot_flagged/i.test(error.message)
}

function classifyProfileRow(row: ProfileBotRow, burstSize: number): BotClassification {
  return classifyAccount({
    email: row.email,
    fullName: row.full_name,
    certificateName: row.certificate_name,
    role: row.role,
    signupBurstSize: burstSize,
  })
}

function classifyLeadRow(
  row: LeadBotRow,
  counts: { email: number; message: number; burst: number }
): BotClassification {
  return classifyLead({
    email: row.email,
    name: row.name,
    phone: row.phone,
    message: row.message,
    repeatEmailCount: counts.email,
    identicalMessageCount: counts.message,
    burstSize: counts.burst,
  })
}

function minuteBucket(iso: string): string {
  return iso.slice(0, 16)
}

export async function listBotReviewRows(): Promise<ActionResult<BotReviewRow[]>> {
  const actorResult = await requireAdminActor()
  if (!actorResult.success) {
    return actorResult
  }

  try {
    const supabase = createAdminClient()
    const [profilesResult, leadsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, email, full_name, certificate_name, role, created_at, suspected_bot, bot_reason, bot_flagged_at"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("leads")
        .select(
          "id, email, name, phone, message, lead_type, source, created_at, suspected_bot, bot_reason, bot_flagged_at"
        )
        .order("created_at", { ascending: false }),
    ])

    if (isMissingBotColumnError(profilesResult.error) || isMissingBotColumnError(leadsResult.error)) {
      return failure(
        "schema_not_ready",
        "Bot review columns are not applied yet. Run migration 20261025180000_bot_review_flags.sql."
      )
    }

    if (profilesResult.error) {
      logger.error("[bot-review] list profiles failed", {
        code: profilesResult.error.code,
        message: profilesResult.error.message,
      })
      return failure("provider_error", "Unable to load members for bot review.")
    }

    if (leadsResult.error) {
      logger.error("[bot-review] list leads failed", {
        code: leadsResult.error.code,
        message: leadsResult.error.message,
      })
      return failure("provider_error", "Unable to load enquiries for bot review.")
    }

    const profiles = (profilesResult.data ?? []) as ProfileBotRow[]
    const leads = (leadsResult.data ?? []) as LeadBotRow[]

    const profileBurst = new Map<string, number>()
    for (const profile of profiles) {
      const key = minuteBucket(profile.created_at)
      profileBurst.set(key, (profileBurst.get(key) ?? 0) + 1)
    }

    const leadEmailCounts = new Map<string, number>()
    const leadMessageCounts = new Map<string, number>()
    const leadBurst = new Map<string, number>()
    for (const lead of leads) {
      const email = lead.email.trim().toLowerCase()
      leadEmailCounts.set(email, (leadEmailCounts.get(email) ?? 0) + 1)
      const message = String(lead.message ?? "").trim().toLowerCase()
      if (message) {
        leadMessageCounts.set(message, (leadMessageCounts.get(message) ?? 0) + 1)
      }
      const key = minuteBucket(lead.created_at)
      leadBurst.set(key, (leadBurst.get(key) ?? 0) + 1)
    }

    const rows: BotReviewRow[] = [
      ...profiles.map((profile) => ({
        targetType: "profile" as const,
        id: profile.id,
        email: profile.email,
        displayName: profile.full_name,
        createdAt: profile.created_at,
        suspectedBot: profile.suspected_bot,
        botReason: profile.bot_reason,
        botFlaggedAt: profile.bot_flagged_at,
        classification: classifyProfileRow(
          profile,
          profileBurst.get(minuteBucket(profile.created_at)) ?? 1
        ),
      })),
      ...leads.map((lead) => ({
        targetType: "lead" as const,
        id: lead.id,
        email: lead.email,
        displayName: lead.name,
        createdAt: lead.created_at,
        suspectedBot: lead.suspected_bot,
        botReason: lead.bot_reason,
        botFlaggedAt: lead.bot_flagged_at,
        classification: classifyLeadRow(lead, {
          email: leadEmailCounts.get(lead.email.trim().toLowerCase()) ?? 1,
          message: leadMessageCounts.get(String(lead.message ?? "").trim().toLowerCase()) ?? 0,
          burst: leadBurst.get(minuteBucket(lead.created_at)) ?? 1,
        }),
      })),
    ]

    return success(rows)
  } catch (caughtError) {
    logger.error("[bot-review] list unexpected error", {
      error: safeErrorMessage(caughtError),
    })
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function buildBotDryRunReport(): Promise<ActionResult<BotDryRunReport>> {
  const listResult = await listBotReviewRows()
  if (!listResult.success) {
    return listResult
  }

  const profiles = listResult.data.filter((row) => row.targetType === "profile")
  const leads = listResult.data.filter((row) => row.targetType === "lead")

  return success({
    generatedAt: new Date().toISOString(),
    wroteProduction: false,
    profiles: {
      total: profiles.length,
      alreadyFlagged: profiles.filter((row) => row.suspectedBot).length,
      autoFlagSafeIds: profiles
        .filter((row) => row.classification.recommendedAction === "auto_flag_safe")
        .map((row) => row.id),
      manualReviewIds: profiles
        .filter((row) => row.classification.recommendedAction === "manual_review")
        .map((row) => row.id),
    },
    leads: {
      total: leads.length,
      alreadyFlagged: leads.filter((row) => row.suspectedBot).length,
      autoFlagSafeIds: leads
        .filter((row) => row.classification.recommendedAction === "auto_flag_safe")
        .map((row) => row.id),
      manualReviewIds: leads
        .filter((row) => row.classification.recommendedAction === "manual_review")
        .map((row) => row.id),
    },
    notes: [
      "This report does not write to the database.",
      "autoFlagSafeIds match internal test/E2E patterns only.",
      "Do not bulk-flag production records from this report without a human review.",
    ],
  })
}

export async function flagBotRecord(
  input: FlagBotRecordInput
): Promise<ActionResult<{ id: string; suspectedBot: boolean }>> {
  const parsed = flagBotRecordSchema.safeParse(input)
  if (!parsed.success) {
    return failure("validation_error", firstValidationMessage(parsed.error))
  }

  const actorResult = await requireAdminActor()
  if (!actorResult.success) {
    return actorResult
  }

  const profileResult = await getCurrentProfile()
  const flaggedBy = profileResult.success ? profileResult.data.id : null

  const reason =
    parsed.data.suspected === false
      ? null
      : parsed.data.reason?.trim() || "manual_admin_review"

  try {
    const supabase = createAdminClient()
    const table = parsed.data.targetType === "profile" ? "profiles" : "leads"
    const { data, error } = await supabase
      .from(table)
      .update({
        suspected_bot: parsed.data.suspected,
        bot_reason: reason,
        bot_flagged_at: parsed.data.suspected ? new Date().toISOString() : null,
        bot_flagged_by: parsed.data.suspected ? flaggedBy : null,
      })
      .eq("id", parsed.data.id)
      .select("id")
      .maybeSingle()

    if (isMissingBotColumnError(error)) {
      return failure(
        "schema_not_ready",
        "Bot review columns are not applied yet. Run migration 20261025180000_bot_review_flags.sql."
      )
    }

    if (error) {
      logger.error("[bot-review] flag update failed", {
        code: error.code,
        message: error.message,
        targetType: parsed.data.targetType,
      })
      return failure("provider_error", "Unable to update bot flag.")
    }

    if (!data) {
      return failure("not_found", "Record not found.")
    }

    logger.info("[audit] bot flag updated", {
      actorEmail: actorResult.data.email,
      targetType: parsed.data.targetType,
      targetId: parsed.data.id,
      suspected: parsed.data.suspected,
      reason,
    })

    return success({ id: data.id, suspectedBot: parsed.data.suspected })
  } catch (caughtError) {
    logger.error("[bot-review] flag unexpected error", {
      error: safeErrorMessage(caughtError),
    })
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}
