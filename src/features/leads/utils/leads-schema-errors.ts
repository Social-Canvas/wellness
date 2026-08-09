function errorHaystack(error: {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
}): string {
  return [error.message, error.details, error.hint]
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(" ")
    .toLowerCase()
}

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

  const haystack = errorHaystack(error)

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

/**
 * Detect invalid `lead_type` enum values (e.g. `nonprofit` / `contact`
 * before the hardening migration adds them).
 */
export function isInvalidLeadTypeEnumError(error: {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
}): boolean {
  const code = (error.code ?? "").trim()
  const haystack = errorHaystack(error)

  if (!haystack) {
    return false
  }

  const mentionsLeadType =
    haystack.includes("lead_type") || haystack.includes("lead type")
  const mentionsInvalidEnum =
    haystack.includes("invalid input value for enum") ||
    haystack.includes("invalid_enum") ||
    (haystack.includes("invalid") && haystack.includes("enum")) ||
    haystack.includes("not a valid") ||
    code === "22P02"

  if (!(mentionsLeadType && mentionsInvalidEnum)) {
    // PostgREST sometimes omits "enum" wording but still cites the value.
    if (
      mentionsLeadType &&
      (haystack.includes("nonprofit") || haystack.includes("contact")) &&
      (haystack.includes("invalid") ||
        haystack.includes("not find") ||
        code === "22P02" ||
        code === "PGRST116")
    ) {
      return true
    }
    return false
  }

  return (
    haystack.includes("nonprofit") ||
    haystack.includes("contact") ||
    mentionsLeadType
  )
}

export const LEADS_SCHEMA_NOT_READY_MESSAGE =
  "Enquiry schema migration not applied yet. Apply migration 20260809233000_enquiry_lead_hardening.sql to enable full enquiry inbox features (status workflow and notification fields)." as const
