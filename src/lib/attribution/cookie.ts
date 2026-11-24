import { cookies } from "next/headers"

import { ATTRIBUTION_COOKIE } from "@/lib/attribution/cookie-name"
import {
  mergeUtm,
  readUtmFromUnknown,
  utmToMetadata,
  type UtmAttribution,
} from "@/lib/attribution/utm"

export { ATTRIBUTION_COOKIE }

export async function readAttributionFromCookies(): Promise<UtmAttribution> {
  const store = await cookies()
  const raw = store.get(ATTRIBUTION_COOKIE)?.value
  if (!raw) return {}

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>
    return readUtmFromUnknown(parsed)
  } catch {
    return {}
  }
}

export async function readAttributionMetadata(): Promise<Record<string, string>> {
  return utmToMetadata(await readAttributionFromCookies())
}

export function mergeAttributionMetadata(
  metadata: Record<string, unknown> | null | undefined,
  attribution: UtmAttribution
): Record<string, unknown> {
  const current = readUtmFromUnknown(metadata ?? undefined)
  return {
    ...(metadata ?? {}),
    ...utmToMetadata(mergeUtm(current, attribution)),
  }
}
