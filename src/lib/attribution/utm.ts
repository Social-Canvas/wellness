export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const

export type UtmKey = (typeof UTM_KEYS)[number]

export type UtmAttribution = Partial<Record<UtmKey, string>>

const MAX_UTM_LENGTH = 120

export function sanitizeUtmValue(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim().replace(/[\r\n\t]/g, "")
  if (!trimmed) return null
  return trimmed.slice(0, MAX_UTM_LENGTH)
}

export function readUtmFromSearchParams(
  params: Pick<URLSearchParams, "get">
): UtmAttribution {
  const result: UtmAttribution = {}

  for (const key of UTM_KEYS) {
    const value = sanitizeUtmValue(params.get(key))
    if (value) {
      result[key] = value
    }
  }

  return result
}

/** First touch wins. Later visits do not overwrite values already stored. */
export function mergeUtm(
  current: UtmAttribution,
  incoming: UtmAttribution
): UtmAttribution {
  const next: UtmAttribution = { ...current }

  for (const key of UTM_KEYS) {
    if (!next[key] && incoming[key]) {
      next[key] = incoming[key]
    }
  }

  return next
}

export function utmToMetadata(utm: UtmAttribution): Record<string, string> {
  const metadata: Record<string, string> = {}

  for (const key of UTM_KEYS) {
    const value = utm[key]
    if (value) {
      metadata[key] = value
    }
  }

  return metadata
}

export function readUtmFromUnknown(
  value: Record<string, unknown> | null | undefined
): UtmAttribution {
  const result: UtmAttribution = {}
  if (!value) return result

  for (const key of UTM_KEYS) {
    const raw = value[key]
    const sanitized = sanitizeUtmValue(typeof raw === "string" ? raw : null)
    if (sanitized) {
      result[key] = sanitized
    }
  }

  return result
}
