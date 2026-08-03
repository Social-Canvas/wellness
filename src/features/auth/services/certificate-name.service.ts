import "server-only"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  adminCorrectCertificateNameSchema,
  adminReissueCertificateSchema,
  setCertificateNameOnceSchema,
  type AdminCorrectCertificateNameInput,
  type AdminReissueCertificateInput,
  type SetCertificateNameOnceInput,
} from "@/features/auth/schemas"
import type { UserRole } from "@/features/auth/types"
import {
  validateCertificateName,
  type CertificateNameSetSource,
} from "@/features/auth/utils/certificate-name"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { logger, safeErrorMessage } from "@/server/utils/logger"
import type { Json } from "@/types/database/supabase"

type SetOnceRpcResult = {
  success?: boolean
  certificate_name?: string
  set_source?: string
  error_code?: string
  message?: string
}

type AdminCorrectRpcResult = {
  success?: boolean
  previous_name?: string | null
  new_name?: string
  error_code?: string
  message?: string
}

const ADMIN_ROLES = new Set<UserRole>(["admin", "super_admin"])

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

function parseJsonObject(value: Json | SetOnceRpcResult | null): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

/**
 * Atomically set the caller's certificate name exactly once.
 * Browser cannot supply user id, lock timestamp, or admin override.
 */
export async function setCertificateNameOnce(
  input: SetCertificateNameOnceInput
): Promise<ActionResult<{ certificateName: string; setSource: CertificateNameSetSource }>> {
  const parsed = setCertificateNameOnceSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  const validated = validateCertificateName(parsed.data.certificateName)

  if (!validated.ok) {
    return validationFailure(validated.message)
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return failure("authentication_required", "You must be signed in.")
    }

    const { data, error } = await supabase.rpc("set_certificate_name_once", {
      p_name: validated.value,
      p_source: parsed.data.source,
    })

    if (error) {
      logger.error("[certificate-name] setCertificateNameOnce rpc failed", {
        code: error.code,
        message: error.message,
      })
      return failure("provider_error", "Unable to save your certificate name. Please try again.")
    }

    const payload = parseJsonObject(data as Json) as SetOnceRpcResult

    if (!payload.success) {
      return failure(
        typeof payload.error_code === "string" ? payload.error_code : "provider_error",
        typeof payload.message === "string"
          ? payload.message
          : "Unable to save your certificate name."
      )
    }

    const setSource =
      payload.set_source === "signup" || payload.set_source === "onboarding"
        ? payload.set_source
        : parsed.data.source

    return success({
      certificateName:
        typeof payload.certificate_name === "string"
          ? payload.certificate_name
          : validated.value,
      setSource,
    })
  } catch (caughtError) {
    logger.error("[certificate-name] setCertificateNameOnce unexpected error", {
      error: safeErrorMessage(caughtError),
    })
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function adminCorrectCertificateName(
  input: AdminCorrectCertificateNameInput
): Promise<
  ActionResult<{ previousName: string | null; newName: string; profileId: string }>
> {
  const parsed = adminCorrectCertificateNameSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  const validated = validateCertificateName(parsed.data.certificateName)

  if (!validated.ok) {
    return validationFailure(validated.message)
  }

  try {
    const sessionClient = await createClient()
    const {
      data: { user },
      error: userError,
    } = await sessionClient.auth.getUser()

    if (userError || !user) {
      return failure("authentication_required", "You must be signed in.")
    }

    const admin = createAdminClient()
    const { data: actorProfile, error: actorError } = await admin
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .maybeSingle()

    if (actorError || !actorProfile) {
      return failure("forbidden", "You do not have permission to correct certificate names.")
    }

    if (!ADMIN_ROLES.has(actorProfile.role)) {
      return failure("forbidden", "Only administrators can correct certificate names.")
    }

    const { data, error } = await admin.rpc("admin_correct_certificate_name", {
      p_profile_id: parsed.data.profileId,
      p_new_name: validated.value,
      p_reason: parsed.data.reason,
      p_admin_profile_id: actorProfile.id,
    })

    if (error) {
      logger.error("[certificate-name] adminCorrectCertificateName rpc failed", {
        code: error.code,
        message: error.message,
        profileId: parsed.data.profileId,
      })
      return failure("provider_error", "Unable to correct certificate name. Please try again.")
    }

    const payload = parseJsonObject(data as Json) as AdminCorrectRpcResult

    if (!payload.success) {
      return failure(
        typeof payload.error_code === "string" ? payload.error_code : "provider_error",
        typeof payload.message === "string"
          ? payload.message
          : "Unable to correct certificate name."
      )
    }

    logger.info("[audit] certificate name corrected", {
      actorProfileId: actorProfile.id,
      targetProfileId: parsed.data.profileId,
      // Never log the actual names.
      hadPreviousName: Boolean(payload.previous_name),
    })

    return success({
      previousName:
        typeof payload.previous_name === "string" ? payload.previous_name : null,
      newName:
        typeof payload.new_name === "string" ? payload.new_name : validated.value,
      profileId: parsed.data.profileId,
    })
  } catch (caughtError) {
    logger.error("[certificate-name] adminCorrectCertificateName unexpected error", {
      error: safeErrorMessage(caughtError),
    })
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

/**
 * Explicit admin reissue: updates only the certificate snapshot to the
 * member's current locked certificate_name. Does not create a duplicate ID.
 */
export async function adminReissueCertificateRecipientName(
  input: AdminReissueCertificateInput
): Promise<ActionResult<{ certificateId: string; recipientName: string }>> {
  const parsed = adminReissueCertificateSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    const sessionClient = await createClient()
    const {
      data: { user },
      error: userError,
    } = await sessionClient.auth.getUser()

    if (userError || !user) {
      return failure("authentication_required", "You must be signed in.")
    }

    const admin = createAdminClient()
    const { data: actorProfile, error: actorError } = await admin
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .maybeSingle()

    if (actorError || !actorProfile || !ADMIN_ROLES.has(actorProfile.role)) {
      return failure("forbidden", "Only administrators can reissue certificates.")
    }

    const { data: certificate, error: certificateError } = await admin
      .from("certificates")
      .select("id, user_id, recipient_name, certificate_number")
      .eq("id", parsed.data.certificateId)
      .maybeSingle()

    if (certificateError) {
      return failure("provider_error", "Unable to load certificate. Please try again.")
    }

    if (!certificate) {
      return failure("not_found", "Certificate not found.")
    }

    const { data: memberProfile, error: memberError } = await admin
      .from("profiles")
      .select("id, certificate_name, certificate_name_locked_at")
      .eq("id", certificate.user_id)
      .maybeSingle()

    if (memberError || !memberProfile) {
      return failure("not_found", "Member profile not found.")
    }

    if (!memberProfile.certificate_name || !memberProfile.certificate_name_locked_at) {
      return failure(
        "not_eligible",
        "Member must have a locked certificate name before reissue."
      )
    }

    const previousName = certificate.recipient_name

    const { error: updateError } = await admin
      .from("certificates")
      .update({ recipient_name: memberProfile.certificate_name })
      .eq("id", certificate.id)

    if (updateError) {
      logger.error("[certificate-name] adminReissueCertificate update failed", {
        code: updateError.code,
        message: updateError.message,
        certificateId: certificate.id,
      })
      return failure("provider_error", "Unable to reissue certificate. Please try again.")
    }

    const { error: auditError } = await admin.from("certificate_name_audit").insert({
      profile_id: memberProfile.id,
      previous_name: previousName,
      new_name: memberProfile.certificate_name,
      reason: parsed.data.reason,
      action: "admin_correction",
      corrected_by: actorProfile.id,
      certificate_id: certificate.id,
    })

    if (auditError) {
      logger.error("[certificate-name] adminReissueCertificate audit insert failed", {
        code: auditError.code,
        message: auditError.message,
        certificateId: certificate.id,
      })
    }

    logger.info("[audit] certificate recipient_name reissued", {
      actorProfileId: actorProfile.id,
      certificateId: certificate.id,
      certificateNumber: certificate.certificate_number,
    })

    return success({
      certificateId: certificate.id,
      recipientName: memberProfile.certificate_name,
    })
  } catch (caughtError) {
    logger.error("[certificate-name] adminReissueCertificate unexpected error", {
      error: safeErrorMessage(caughtError),
    })
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function countCertificatesMissingRecipientName(): Promise<
  ActionResult<{ count: number }>
> {
  try {
    const admin = createAdminClient()
    const { count, error } = await admin
      .from("certificates")
      .select("id", { count: "exact", head: true })
      .is("recipient_name", null)

    if (error) {
      return failure("provider_error", "Unable to count certificates needing review.")
    }

    return success({ count: count ?? 0 })
  } catch (caughtError) {
    logger.error("[certificate-name] countCertificatesMissingRecipientName failed", {
      error: safeErrorMessage(caughtError),
    })
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}
