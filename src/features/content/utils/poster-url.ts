/**
 * Returns a poster URL only when it is safe to pass to Mux Player / <img>.
 * Empty strings and non-http(s) values produce broken-image icons in players.
 * Prefer explicit thumbnail; otherwise derive Mux poster from playback ID.
 */
export function resolvePosterUrl(
  value: string | null | undefined,
  muxPlaybackId?: string | null
): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed) {
      try {
        const url = new URL(trimmed)
        if (url.protocol === "http:" || url.protocol === "https:") {
          return trimmed
        }
      } catch {
        // fall through to Mux playback poster
      }
    }
  }

  const playbackId = muxPlaybackId?.trim()
  if (!playbackId) {
    return undefined
  }

  const params = new URLSearchParams({
    width: "640",
    height: "360",
    fit_mode: "smartcrop",
    time: "1",
  })
  return `https://image.mux.com/${encodeURIComponent(playbackId)}/thumbnail.jpg?${params.toString()}`
}
