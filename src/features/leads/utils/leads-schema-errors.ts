/**
 * Detect PostgREST/Postgres failures caused by enquiry hardening columns
 * not existing yet (migration not applied).
 */
export function isMissingLeadsSchemaError(error: {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
}): boolean {
  const code = (error.code ?? "").trim()
  if (code === "PGRST204" || code === "42703") {
    return true
  }

  const haystack = [error.message, error.details, error.hint]
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ")
    .toLowerCase()

  if (!haystack) {
    return false
  }

  const mentionsMissingColumn =
    haystack.includes("does not exist") ||
    (haystack.includes("could not find") && haystack.includes("column"))

  if (!mentionsMissingColumn) {
    return false
  }

  return (
    haystack.includes("status") ||
    haystack.includes("organization_name") ||
    haystack.includes("estimated_participants") ||
    haystack.includes("interest") ||
    haystack.includes("notification_status") ||
    haystack.includes("visitor_ack_status") ||
    haystack.includes("last_notification_error") ||
    haystack.includes("leads")
  )
}

export const LEADS_SCHEMA_NOT_READY_MESSAGE =
  "Enquiry schema migration not applied yet. Apply migration 20260809233000_enquiry_lead_hardening.sql to enable full enquiry inbox features (status workflow and notification fields)." as const
