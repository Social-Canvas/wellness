/**
 * Public homepage video testimonials — customer-facing fields only.
 * Never expose source filenames, Mux asset IDs, or local paths in the UI.
 */

export type TestimonialPublicationStatus = "draft" | "published"

export type HomepageVideoTestimonial = {
  /** Stable public ID (not a database UUID). */
  id: string
  /** Approved display name, or null when client metadata is pending. */
  displayName: string | null
  /** Approved role / member context, or null when pending. */
  roleContext: string | null
  /** Optional short quote — only when client-approved. */
  quote: string | null
  /** Mux public playback ID. Null until upload + readiness succeed. */
  muxPlaybackId: string | null
  /** Poster image URL (Mux thumbnail or approved still). */
  posterUrl: string | null
  /** Optional WebVTT captions URL when client-reviewed captions exist. */
  captionsUrl: string | null
  /** Display order (ascending). */
  sortOrder: number
  publicationStatus: TestimonialPublicationStatus
  /** Accessible label for the portrait video. */
  accessibleLabel: string
}

export type HomepageVideoTestimonialPublic = HomepageVideoTestimonial & {
  publicationStatus: "published"
  muxPlaybackId: string
}
