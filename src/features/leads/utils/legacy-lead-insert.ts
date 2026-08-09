/**
 * Legacy `leads` insert helpers for when
 * `20260809233000_enquiry_lead_hardening.sql` is not applied yet.
 *
 * Kept free of path aliases so unit tests can execute under `node --test`.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/** Subset of `leads` insert shape used by enquiry submission. */
export type LeadInsertRow = {
  lead_type: string
  name: string
  email: string
  phone?: string | null
  message?: string | null
  source?: string | null
  metadata?: Json
  ghl_contact_id?: string | null
  ghl_sync_status?: string
  status?: string
  organization_name?: string | null
  estimated_participants?: string | null
  interest?: string | null
  notification_status?: string
  visitor_ack_status?: string
  last_notification_error?: string | null
}

/** Columns added by the enquiry hardening migration. */
export const HARDENING_LEAD_INSERT_KEYS = [
  "status",
  "organization_name",
  "estimated_participants",
  "interest",
  "notification_status",
  "visitor_ack_status",
  "last_notification_error",
] as const

/** Enum values that do not exist until the hardening migration is applied. */
export const HARDENING_ONLY_LEAD_TYPES = ["nonprofit", "contact"] as const

export type HardeningOnlyLeadType = (typeof HARDENING_ONLY_LEAD_TYPES)[number]

/** Stored on `private_event` rows when the DB enum lacks nonprofit/contact. */
export const LEGACY_LEAD_TYPE_FALLBACK = "private_event" as const

type ProviderErrorLike = {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
}

function asMetadataRecord(value: Json | undefined): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) }
  }
  return {}
}

function putMetadataString(
  metadata: Record<string, unknown>,
  key: string,
  value: string | null | undefined
): void {
  if (typeof value !== "string") {
    return
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return
  }
  if (!(key in metadata) || metadata[key] == null || metadata[key] === "") {
    metadata[key] = trimmed
  }
}

export function isHardeningOnlyLeadType(
  leadType: string | null | undefined
): leadType is HardeningOnlyLeadType {
  return leadType === "nonprofit" || leadType === "contact"
}

/**
 * Strip hardening columns and fold org / participants / interest into metadata
 * so inserts succeed against the pre-migration `leads` table.
 */
export function buildLegacyLeadInsertPayload(
  row: LeadInsertRow
): LeadInsertRow {
  const metadata = asMetadataRecord(row.metadata)
  putMetadataString(metadata, "organizationName", row.organization_name)
  putMetadataString(
    metadata,
    "estimatedParticipants",
    row.estimated_participants
  )
  putMetadataString(metadata, "interest", row.interest)

  const legacy: LeadInsertRow = {
    lead_type: row.lead_type,
    name: row.name,
    email: row.email,
    phone: row.phone ?? null,
    message: row.message ?? null,
    source: row.source ?? null,
    metadata: metadata as Json,
  }

  if (row.ghl_contact_id !== undefined) {
    legacy.ghl_contact_id = row.ghl_contact_id
  }
  if (row.ghl_sync_status !== undefined) {
    legacy.ghl_sync_status = row.ghl_sync_status
  }

  return legacy
}

/**
 * When `nonprofit` / `contact` enum values are rejected, store as
 * `private_event` and keep the canonical type in metadata for admin labeling.
 */
export function buildLegacyLeadTypeFallbackPayload(
  row: LeadInsertRow
): LeadInsertRow {
  const legacy = buildLegacyLeadInsertPayload(row)
  const originalType = row.lead_type

  if (!isHardeningOnlyLeadType(originalType)) {
    return legacy
  }

  const metadata = asMetadataRecord(legacy.metadata)
  metadata.canonical_type = originalType
  metadata.enquiry_type = originalType

  return {
    ...legacy,
    lead_type: LEGACY_LEAD_TYPE_FALLBACK,
    metadata: metadata as Json,
  }
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

/**
 * Resolve display/filter lead type for legacy rows (metadata canonical override).
 */
export function resolveLegacyLeadType(
  leadType: string,
  metadata: Json | Record<string, unknown> | null | undefined
): string {
  const record =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {}

  const fromMeta =
    metadataString(record, "canonical_type") ??
    metadataString(record, "enquiry_type") ??
    metadataString(record, "canonicalType")

  if (fromMeta === "nonprofit" || fromMeta === "contact") {
    return fromMeta
  }

  if (record.intent === "nonprofit_partnership") {
    return "nonprofit"
  }

  return leadType
}

function asProviderError(error: unknown): ProviderErrorLike {
  if (!error || typeof error !== "object") {
    return { message: typeof error === "string" ? error : null }
  }
  const record = error as Record<string, unknown>
  return {
    code: typeof record.code === "string" ? record.code : null,
    message: typeof record.message === "string" ? record.message : null,
    details: typeof record.details === "string" ? record.details : null,
    hint: typeof record.hint === "string" ? record.hint : null,
  }
}

export type LeadInsertExecutor = (
  row: LeadInsertRow
) => Promise<{ data: { id: string; created_at: string } | null; error: unknown }>

export type InsertLeadSchemaGuards = {
  isMissingSchemaError: (error: ProviderErrorLike) => boolean
  isInvalidLeadTypeEnum: (error: ProviderErrorLike) => boolean
}

/**
 * Try hardened insert, then legacy columns, then enum remapping when needed.
 * Schema-error detectors are injected so this module stays path-alias free.
 */
export async function insertLeadWithSchemaFallback(
  row: LeadInsertRow,
  executeInsert: LeadInsertExecutor,
  guards: InsertLeadSchemaGuards,
  options?: {
    onLegacyColumnFallback?: (error: unknown) => void
    onLeadTypeEnumFallback?: (error: unknown) => void
  }
): Promise<{
  data: { id: string; created_at: string } | null
  error: unknown
  usedLegacyColumns: boolean
  usedLeadTypeFallback: boolean
}> {
  const first = await executeInsert(row)
  if (!first.error && first.data) {
    return {
      data: first.data,
      error: null,
      usedLegacyColumns: false,
      usedLeadTypeFallback: false,
    }
  }

  let lastError: unknown = first.error
  let usedLegacyColumns = false
  let usedLeadTypeFallback = false

  if (guards.isMissingSchemaError(asProviderError(lastError))) {
    options?.onLegacyColumnFallback?.(lastError)
    usedLegacyColumns = true
    const legacy = buildLegacyLeadInsertPayload(row)
    const second = await executeInsert(legacy)
    if (!second.error && second.data) {
      return {
        data: second.data,
        error: null,
        usedLegacyColumns: true,
        usedLeadTypeFallback: false,
      }
    }
    lastError = second.error
  }

  if (
    guards.isInvalidLeadTypeEnum(asProviderError(lastError)) &&
    isHardeningOnlyLeadType(row.lead_type)
  ) {
    options?.onLeadTypeEnumFallback?.(lastError)
    usedLeadTypeFallback = true
    const remapped = buildLegacyLeadTypeFallbackPayload(row)
    const third = await executeInsert(remapped)
    if (!third.error && third.data) {
      return {
        data: third.data,
        error: null,
        usedLegacyColumns: true,
        usedLeadTypeFallback: true,
      }
    }
    lastError = third.error
  }

  return {
    data: null,
    error: lastError,
    usedLegacyColumns,
    usedLeadTypeFallback,
  }
}
