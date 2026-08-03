import type { HomepageVideoTestimonial } from "../types"

/**
 * Launch configuration for six homepage portrait testimonials.
 *
 * Client-approved display names, roles, quotes, captions, and publication
 * consent are still pending. Neutral draft labels only — do not invent
 * identities. Mux playback IDs stay null until permission-confirmed upload.
 */
export const HOMEPAGE_VIDEO_TESTIMONIALS: readonly HomepageVideoTestimonial[] = [
  {
    id: "member-story-1",
    displayName: null,
    roleContext: null,
    quote: null,
    muxPlaybackId: null,
    posterUrl: null,
    captionsUrl: null,
    sortOrder: 1,
    publicationStatus: "draft",
    accessibleLabel: "Member story 1, portrait video testimonial",
  },
  {
    id: "member-story-2",
    displayName: null,
    roleContext: null,
    quote: null,
    muxPlaybackId: null,
    posterUrl: null,
    captionsUrl: null,
    sortOrder: 2,
    publicationStatus: "draft",
    accessibleLabel: "Member story 2, portrait video testimonial",
  },
  {
    id: "member-story-3",
    displayName: null,
    roleContext: null,
    quote: null,
    muxPlaybackId: null,
    posterUrl: null,
    captionsUrl: null,
    sortOrder: 3,
    publicationStatus: "draft",
    accessibleLabel: "Member story 3, portrait video testimonial",
  },
  {
    id: "member-story-4",
    displayName: null,
    roleContext: null,
    quote: null,
    muxPlaybackId: null,
    posterUrl: null,
    captionsUrl: null,
    sortOrder: 4,
    publicationStatus: "draft",
    accessibleLabel: "Member story 4, portrait video testimonial",
  },
  {
    id: "member-story-5",
    displayName: null,
    roleContext: null,
    quote: null,
    muxPlaybackId: null,
    posterUrl: null,
    captionsUrl: null,
    sortOrder: 5,
    publicationStatus: "draft",
    accessibleLabel: "Member story 5, portrait video testimonial",
  },
  {
    id: "member-story-6",
    displayName: null,
    roleContext: null,
    quote: null,
    muxPlaybackId: null,
    posterUrl: null,
    captionsUrl: null,
    sortOrder: 6,
    publicationStatus: "draft",
    accessibleLabel: "Member story 6, portrait video testimonial",
  },
] as const

export const VIDEO_TESTIMONIALS_SECTION = {
  eyebrow: "MEMBER STORIES",
  title: "Real experiences. Meaningful change.",
  subtitle:
    "Hear from people who have experienced Elevate’s practices, programs and community.",
  id: "member-stories",
} as const

/** Expected source inventory count for the allowlisted upload script. */
export const HOMEPAGE_TESTIMONIAL_SOURCE_COUNT = 6
