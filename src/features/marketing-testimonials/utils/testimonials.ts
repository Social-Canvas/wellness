import type {
  HomepageVideoTestimonial,
  HomepageVideoTestimonialPublic,
} from "../types"

export function sortTestimonials(
  items: readonly HomepageVideoTestimonial[]
): HomepageVideoTestimonial[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getPublishedTestimonials(
  items: readonly HomepageVideoTestimonial[]
): HomepageVideoTestimonialPublic[] {
  return sortTestimonials(items).filter(
    (item): item is HomepageVideoTestimonialPublic =>
      item.publicationStatus === "published" &&
      typeof item.muxPlaybackId === "string" &&
      item.muxPlaybackId.length > 0
  )
}

/** Testimonials rendered in the carousel (published, or draft placeholders for layout). */
export function getCarouselTestimonials(
  items: readonly HomepageVideoTestimonial[],
  options?: { includeDraftPlaceholders?: boolean }
): HomepageVideoTestimonial[] {
  const published = getPublishedTestimonials(items)
  if (published.length > 0) {
    return published
  }
  if (options?.includeDraftPlaceholders) {
    return sortTestimonials(items)
  }
  return []
}

export function buildMuxPosterUrl(
  playbackId: string | null | undefined,
  options?: { width?: number; height?: number; time?: number }
): string | null {
  if (!playbackId?.trim()) {
    return null
  }
  const width = options?.width ?? 540
  const height = options?.height ?? 960
  const time = options?.time ?? 1
  return `https://image.mux.com/${encodeURIComponent(playbackId.trim())}/thumbnail.jpg?width=${width}&height=${height}&fit_mode=smartcrop&time=${time}`
}

export function resolveTestimonialPoster(
  item: HomepageVideoTestimonial
): string | null {
  if (item.posterUrl?.trim()) {
    return item.posterUrl.trim()
  }
  return buildMuxPosterUrl(item.muxPlaybackId)
}

export function resolveTestimonialDisplayName(
  item: HomepageVideoTestimonial
): string {
  return item.displayName?.trim() || "Testimonial"
}

export function resolveTestimonialRoleContext(
  item: HomepageVideoTestimonial
): string | null {
  const value = item.roleContext?.trim()
  return value ? value : null
}

export function buildSlideAccessibleName(
  item: HomepageVideoTestimonial,
  index: number,
  total: number
): string {
  const name = resolveTestimonialDisplayName(item)
  return `${item.accessibleLabel}. Slide ${index + 1} of ${total}: ${name}`
}

/** Guard: never leak source filenames or absolute local paths into public UI strings. */
export function containsForbiddenMediaLeak(value: string): boolean {
  const lower = value.toLowerCase()
  return (
    lower.includes(".mp4") ||
    lower.includes(".mov") ||
    lower.includes("downloads/testimonials") ||
    lower.includes("/users/") ||
    /(?:^|[\s/])iacc-test-1(?:[\s.]|$)/i.test(value) ||
    /(?:^|[\s/])test-[2-6](?:[\s.]|$)/i.test(value) ||
    /test-5-ritu/i.test(value)
  )
}
