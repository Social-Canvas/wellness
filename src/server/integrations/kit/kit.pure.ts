/**
 * Pure Kit integration helpers (no path aliases — unit-testable under node:test).
 */
import { z } from "zod"

const booleanEnvSchema = z
  .enum(["1", "true", "yes", "on", "0", "false", "no", "off", ""])
  .optional()

export type KitRuntimeConfig = {
  syncEnabled: boolean
  apiKeyPresent: boolean
  apiKey: string
  newsletterFormId: number | null
  isProduction: boolean
  isTestEnvironment: boolean
  requestTimeoutMs: number
}

function parseNewsletterFormId(): number | null {
  const raw = process.env.KIT_NEWSLETTER_FORM_ID?.trim()
  if (!raw) {
    return null
  }

  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  const parsed = booleanEnvSchema.safeParse(value?.trim().toLowerCase())
  if (!parsed.success || !parsed.data) {
    return defaultValue
  }

  return ["1", "true", "yes", "on"].includes(parsed.data)
}

export function getKitConfig(): KitRuntimeConfig {
  const isProduction = process.env.NODE_ENV === "production"
  const isTestEnvironment =
    process.env.NODE_ENV === "test" ||
    process.env.CI === "true" ||
    process.env.CI === "1"

  const timeoutRaw = Number.parseInt(process.env.KIT_REQUEST_TIMEOUT_MS ?? "8000", 10)

  return {
    syncEnabled: parseBoolean(process.env.KIT_SYNC_ENABLED, false),
    apiKeyPresent: Boolean(process.env.KIT_API_KEY?.trim()),
    apiKey: process.env.KIT_API_KEY?.trim() ?? "",
    newsletterFormId: parseNewsletterFormId(),
    isProduction,
    isTestEnvironment,
    requestTimeoutMs:
      Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? Math.min(timeoutRaw, 30000) : 8000,
  }
}

export type KitWriteBlockReason =
  | "sync_disabled"
  | "missing_api_key"
  | "test_environment"
  | null

export function getKitWriteBlockReason(
  config: KitRuntimeConfig = getKitConfig()
): KitWriteBlockReason {
  if (config.isTestEnvironment) {
    return "test_environment"
  }

  if (!config.syncEnabled) {
    return "sync_disabled"
  }

  if (!config.apiKeyPresent) {
    return "missing_api_key"
  }

  return null
}

export function canPerformKitWrite(config: KitRuntimeConfig = getKitConfig()): boolean {
  return getKitWriteBlockReason(config) === null
}

export const KIT_API_BASE_URL = "https://api.kit.com"

export interface KitSubscriber {
  id: number
  first_name: string | null
  email_address: string
  state: "active" | "cancelled" | "bounced" | "complained" | "inactive"
  created_at: string
  fields: Record<string, string>
}

export interface KitCreateSubscriberInput {
  emailAddress: string
  firstName: string | null
}

export type KitClientResult =
  | { ok: true; subscriber: KitSubscriber; created: boolean }
  | { ok: false; error: string; status: number | null; subscriberId?: number }

export type KitHttpClientDeps = {
  fetchImpl: typeof fetch
  config: KitRuntimeConfig
}

const KIT_KEY_FRAGMENT = /kit_[A-Za-z0-9_-]+/gi

function redactKitSecrets(value: string): string {
  return value.replace(KIT_KEY_FRAGMENT, "[REDACTED]")
}

function parseKitSubscriber(value: unknown): KitSubscriber | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>
  const subscriber = record.subscriber

  if (!subscriber || typeof subscriber !== "object") {
    return null
  }

  const sub = subscriber as Record<string, unknown>

  if (typeof sub.id !== "number" || typeof sub.email_address !== "string") {
    return null
  }

  return {
    id: sub.id,
    first_name: typeof sub.first_name === "string" ? sub.first_name : null,
    email_address: sub.email_address,
    state:
      sub.state === "active" ||
      sub.state === "cancelled" ||
      sub.state === "bounced" ||
      sub.state === "complained" ||
      sub.state === "inactive"
        ? sub.state
        : "active",
    created_at: typeof sub.created_at === "string" ? sub.created_at : "",
    fields:
      sub.fields && typeof sub.fields === "object"
        ? (sub.fields as Record<string, string>)
        : {},
  }
}

function summarizeKitErrorBody(body: unknown): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>
    if (Array.isArray(record.errors)) {
      const messages = record.errors
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => redactKitSecrets(entry))
      if (messages.length > 0) {
        return messages.join("; ")
      }
    }
  }

  return "Kit API request failed"
}

async function kitJsonRequest(
  url: string,
  init: RequestInit,
  deps: Partial<KitHttpClientDeps>
): Promise<{ response: Response; parsedBody: unknown }> {
  const config = deps.config ?? getKitConfig()
  const fetchImpl = deps.fetchImpl ?? fetch
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs)

  try {
    const response = await fetchImpl(url, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Kit-Api-Key": config.apiKey,
        ...(init.headers as Record<string, string> | undefined),
      },
      signal: controller.signal,
    })

    const rawBody = await response.text()
    let parsedBody: unknown = null

    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody)
      } catch {
        parsedBody = null
      }
    }

    return { response, parsedBody }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Kit API request timed out")
    }

    throw new Error(redactKitSecrets(error instanceof Error ? error.message : "Kit API request failed"))
  } finally {
    clearTimeout(timeout)
  }
}

export async function createOrUpdateKitSubscriber(
  input: KitCreateSubscriberInput,
  deps: Partial<KitHttpClientDeps> = {}
): Promise<KitClientResult> {
  try {
    const { response, parsedBody } = await kitJsonRequest(
      `${KIT_API_BASE_URL}/v4/subscribers`,
      {
        method: "POST",
        body: JSON.stringify({
          email_address: input.emailAddress,
          first_name: input.firstName,
          state: "active",
        }),
      },
      deps
    )

    if (!response.ok) {
      return {
        ok: false,
        error: redactKitSecrets(summarizeKitErrorBody(parsedBody)),
        status: response.status,
      }
    }

    const subscriber = parseKitSubscriber(parsedBody)

    if (!subscriber) {
      return {
        ok: false,
        error: "Kit API returned an unexpected subscriber payload",
        status: response.status,
      }
    }

    return {
      ok: true,
      subscriber,
      created: response.status === 201,
    }
  } catch (error) {
    return {
      ok: false,
      error: redactKitSecrets(error instanceof Error ? error.message : "Kit API request failed"),
      status: null,
    }
  }
}

export interface KitAddToFormInput {
  formId: number
  emailAddress: string
  referrer?: string | null
}

export async function addSubscriberToKitForm(
  input: KitAddToFormInput,
  deps: Partial<KitHttpClientDeps> = {}
): Promise<KitClientResult> {
  try {
    const { response, parsedBody } = await kitJsonRequest(
      `${KIT_API_BASE_URL}/v4/forms/${input.formId}/subscribers`,
      {
        method: "POST",
        body: JSON.stringify({
          email_address: input.emailAddress,
          referrer: input.referrer ?? null,
        }),
      },
      deps
    )

    if (!response.ok) {
      return {
        ok: false,
        error: redactKitSecrets(summarizeKitErrorBody(parsedBody)),
        status: response.status,
      }
    }

    const subscriber = parseKitSubscriber(parsedBody)

    if (!subscriber) {
      return {
        ok: false,
        error: "Kit API returned an unexpected form subscriber payload",
        status: response.status,
      }
    }

    return {
      ok: true,
      subscriber,
      created: response.status === 201,
    }
  } catch (error) {
    return {
      ok: false,
      error: redactKitSecrets(error instanceof Error ? error.message : "Kit API request failed"),
      status: null,
    }
  }
}

/**
 * Upsert subscriber then add to the configured newsletter form (when set).
 * Subscriber create is idempotent; form add returns 200 if already subscribed.
 */
export async function syncSubscriberToKit(
  input: KitCreateSubscriberInput,
  deps: Partial<KitHttpClientDeps> = {}
): Promise<KitClientResult> {
  const config = deps.config ?? getKitConfig()
  const subscriberResult = await createOrUpdateKitSubscriber(input, deps)

  if (!subscriberResult.ok) {
    return subscriberResult
  }

  if (!config.newsletterFormId) {
    return subscriberResult
  }

  const formResult = await addSubscriberToKitForm(
    {
      formId: config.newsletterFormId,
      emailAddress: input.emailAddress,
    },
    deps
  )

  if (!formResult.ok) {
    return {
      ok: false,
      error: formResult.error,
      status: formResult.status,
      subscriberId: subscriberResult.subscriber.id,
    }
  }

  return subscriberResult
}

export type MarketingConsentSnapshot = {
  id: string
  email: string
  status: "active" | "unsubscribed"
  kit_subscriber_id: number | null
}

export type KitSyncStatus = "pending" | "synced" | "failed" | "skipped"

export type SyncMarketingConsentDeps = {
  loadConsent: (consentId: string) => Promise<MarketingConsentSnapshot | null>
  updateSyncStatus: (input: {
    consentId: string
    kitSyncStatus: KitSyncStatus
    kitSubscriberId: number | null
    kitLastSyncError: string | null
  }) => Promise<void>
  syncToKit: (
    input: { emailAddress: string; firstName: string | null },
    deps?: Partial<KitHttpClientDeps>
  ) => Promise<KitClientResult>
  config: KitRuntimeConfig
  onSyncFailed?: (input: {
    consentId: string
    status: number | null
    error: string
  }) => void
  onSynced?: (input: {
    consentId: string
    kitSubscriberId: number
    created: boolean
  }) => void
}

function extractFirstName(fullName: string | null | undefined): string | null {
  const trimmed = fullName?.trim()
  if (!trimmed) {
    return null
  }

  const [firstName] = trimmed.split(/\s+/)
  return firstName || null
}

export async function syncMarketingConsentToKit(
  consentId: string,
  options: {
    fullName?: string | null
    deps: SyncMarketingConsentDeps
  }
): Promise<{ synced: boolean; skipped: boolean; failed: boolean }> {
  const deps = options.deps
  const consent = await deps.loadConsent(consentId)

  if (!consent) {
    return { synced: false, skipped: true, failed: false }
  }

  if (consent.status !== "active") {
    await deps.updateSyncStatus({
      consentId,
      kitSyncStatus: "skipped",
      kitSubscriberId: consent.kit_subscriber_id,
      kitLastSyncError: null,
    })
    return { synced: false, skipped: true, failed: false }
  }

  const blockReason = getKitWriteBlockReason(deps.config)

  if (blockReason) {
    await deps.updateSyncStatus({
      consentId,
      kitSyncStatus: "pending",
      kitSubscriberId: consent.kit_subscriber_id,
      kitLastSyncError:
        blockReason === "missing_api_key" ? "KIT_API_KEY is not configured." : null,
    })

    return { synced: false, skipped: false, failed: false }
  }

  const result = await deps.syncToKit(
    {
      emailAddress: consent.email,
      firstName: extractFirstName(options.fullName),
    },
    { config: deps.config }
  )

  if (!result.ok) {
    await deps.updateSyncStatus({
      consentId,
      kitSyncStatus: "failed",
      kitSubscriberId: result.subscriberId ?? consent.kit_subscriber_id,
      kitLastSyncError: result.error,
    })

    deps.onSyncFailed?.({
      consentId,
      status: result.status,
      error: result.error,
    })

    return { synced: false, skipped: false, failed: true }
  }

  await deps.updateSyncStatus({
    consentId,
    kitSyncStatus: "synced",
    kitSubscriberId: result.subscriber.id,
    kitLastSyncError: null,
  })

  deps.onSynced?.({
    consentId,
    kitSubscriberId: result.subscriber.id,
    created: result.created,
  })

  return { synced: true, skipped: false, failed: false }
}

export type KitConsentRetryRow = {
  id: string
  user_id: string | null
}

export type KitConsentRetryResult = {
  eligible: number
  processed: number
  synced: number
  failed: number
  skipped: number
}

export type KitConsentRetryDeps = {
  config: KitRuntimeConfig
  batchSize: number
  fetchEligible: (limit: number) => Promise<KitConsentRetryRow[]>
  resolveFullName: (userId: string | null) => Promise<string | null>
  syncConsent: (
    consentId: string,
    options: { fullName?: string | null }
  ) => Promise<{ synced: boolean; skipped: boolean; failed: boolean }>
  onUnexpectedError?: (input: { consentId: string; error: string }) => void
}

export async function processPendingMarketingConsentSyncs(
  deps: KitConsentRetryDeps
): Promise<KitConsentRetryResult> {
  if (!canPerformKitWrite(deps.config)) {
    return { eligible: 0, processed: 0, synced: 0, failed: 0, skipped: 0 }
  }

  const rows = await deps.fetchEligible(deps.batchSize)
  const result: KitConsentRetryResult = {
    eligible: rows.length,
    processed: 0,
    synced: 0,
    failed: 0,
    skipped: 0,
  }

  for (const row of rows) {
    const fullName = await deps.resolveFullName(row.user_id)

    try {
      const syncResult = await deps.syncConsent(row.id, { fullName })
      result.processed += 1

      if (syncResult.synced) {
        result.synced += 1
      } else if (syncResult.failed) {
        result.failed += 1
      } else if (syncResult.skipped) {
        result.skipped += 1
      }
    } catch (error) {
      result.processed += 1
      result.failed += 1
      deps.onUnexpectedError?.({
        consentId: row.id,
        error: error instanceof Error ? error.message : "unexpected",
      })
    }
  }

  return result
}
