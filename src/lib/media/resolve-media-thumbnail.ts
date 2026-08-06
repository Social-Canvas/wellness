/**
 * Central media thumbnail resolver for course cards, recorded sessions, and players.
 * Priority: explicit URL → Mux poster from playback ID → null (caller uses branded fallback).
 */

export type MediaThumbnailInput = {
  thumbnailUrl?: string | null
  muxPlaybackId?: string | null
  /** Optional Mux image params when deriving from playback ID. */
  muxPoster?: {
    width?: number
    height?: number
    time?: number
  }
}

export type ResolvedMediaThumbnail =
  | { kind: "url"; src: string }
  | { kind: "fallback" }

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export function buildMuxThumbnailUrl(
  playbackId: string,
  options?: { width?: number; height?: number; time?: number }
): string {
  const width = options?.width ?? 640
  const height = options?.height ?? 360
  const time = options?.time ?? 1
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    fit_mode: "smartcrop",
    time: String(time),
  })
  return `https://image.mux.com/${encodeURIComponent(playbackId.trim())}/thumbnail.jpg?${params.toString()}`
}

/**
 * Returns a safe absolute http(s) URL, or null when missing/invalid.
 */
export function resolveSafeMediaUrl(
  value: string | null | undefined
): string | null {
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  if (!trimmed || !isHttpUrl(trimmed)) {
    return null
  }
  return trimmed
}

/**
 * Resolve display thumbnail: explicit → Mux poster → fallback sentinel.
 */
export function resolveMediaThumbnail(
  input: MediaThumbnailInput
): ResolvedMediaThumbnail {
  const explicit = resolveSafeMediaUrl(input.thumbnailUrl)
  if (explicit) {
    return { kind: "url", src: explicit }
  }

  const playbackId = input.muxPlaybackId?.trim()
  if (playbackId) {
    return {
      kind: "url",
      src: buildMuxThumbnailUrl(playbackId, input.muxPoster),
    }
  }

  return { kind: "fallback" }
}
