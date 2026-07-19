/**
 * Returns a poster URL only when it is safe to pass to Mux Player / <img>.
 * Empty strings and non-http(s) values produce broken-image icons in players.
 */
export function resolvePosterUrl(
  value: string | null | undefined
): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }

  const trimmed = value.trim()

  if (!trimmed) {
    return undefined
  }

  try {
    const url = new URL(trimmed)
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined
    }
    return trimmed
  } catch {
    return undefined
  }
}
