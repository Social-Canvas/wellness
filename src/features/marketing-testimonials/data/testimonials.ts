import type { HomepageVideoTestimonial } from "../types"

/**
 * Launch configuration for six homepage portrait testimonials.
 *
 * Client confirmed publication permission ("I'm ok"). Display names, roles,
 * quotes, and captions remain pending — neutral labels only (no invented
 * identities). Mux public playback IDs from permission-confirmed upload.
 */
export const HOMEPAGE_VIDEO_TESTIMONIALS: readonly HomepageVideoTestimonial[] = [
  {
    id: "member-story-1",
    displayName: null,
    roleContext: null,
    quote: null,
    muxPlaybackId: "SZ02Z8sqxbhHc6VKgNOImAv7dxpWC9bQfnJtC5ha4XP00",
    posterUrl:
      "https://image.mux.com/SZ02Z8sqxbhHc6VKgNOImAv7dxpWC9bQfnJtC5ha4XP00/thumbnail.jpg?width=540&height=960&fit_mode=smartcrop&time=1",
    captionsUrl: null,
    sortOrder: 1,
    publicationStatus: "published",
    accessibleLabel: "Testimonial 1, portrait video testimonial",
  },
  {
    id: "member-story-2",
    displayName: null,
    roleContext: null,
    quote: null,
    muxPlaybackId: "Ex02idFGUAYgWJJKqiQX7YU541AqMb8F9udfCPeT8RxM",
    posterUrl:
      "https://image.mux.com/Ex02idFGUAYgWJJKqiQX7YU541AqMb8F9udfCPeT8RxM/thumbnail.jpg?width=540&height=960&fit_mode=smartcrop&time=1",
    captionsUrl: null,
    sortOrder: 2,
    publicationStatus: "published",
    accessibleLabel: "Testimonial 2, portrait video testimonial",
  },
  {
    id: "member-story-3",
    displayName: null,
    roleContext: null,
    quote: null,
    muxPlaybackId: "CJSrmzp8BXukf1Nz9eVYit9WnXgu21YFZ4oinuKsZXk",
    posterUrl:
      "https://image.mux.com/CJSrmzp8BXukf1Nz9eVYit9WnXgu21YFZ4oinuKsZXk/thumbnail.jpg?width=540&height=960&fit_mode=smartcrop&time=1",
    captionsUrl: null,
    sortOrder: 3,
    publicationStatus: "published",
    accessibleLabel: "Testimonial 3, portrait video testimonial",
  },
  {
    id: "member-story-4",
    displayName: null,
    roleContext: null,
    quote: null,
    muxPlaybackId: "o75GYB2TregwxQoGxx3GhlYTQNmBbQqvF71gAqXZFIs",
    posterUrl:
      "https://image.mux.com/o75GYB2TregwxQoGxx3GhlYTQNmBbQqvF71gAqXZFIs/thumbnail.jpg?width=540&height=960&fit_mode=smartcrop&time=1",
    captionsUrl: null,
    sortOrder: 4,
    publicationStatus: "published",
    accessibleLabel: "Testimonial 4, portrait video testimonial",
  },
  {
    id: "member-story-5",
    displayName: null,
    roleContext: null,
    quote: null,
    muxPlaybackId: "rzaCzhZaj628bYqfQgYGv602y302mFhJQP4wNFIc01eWkk",
    posterUrl:
      "https://image.mux.com/rzaCzhZaj628bYqfQgYGv602y302mFhJQP4wNFIc01eWkk/thumbnail.jpg?width=540&height=960&fit_mode=smartcrop&time=1",
    captionsUrl: null,
    sortOrder: 5,
    publicationStatus: "published",
    accessibleLabel: "Testimonial 5, portrait video testimonial",
  },
  {
    id: "member-story-6",
    displayName: null,
    roleContext: null,
    quote: null,
    muxPlaybackId: "Tf00iquxyKyVx01wx2wqRl7EuGWnOILTQXzEzByn012VL4",
    posterUrl:
      "https://image.mux.com/Tf00iquxyKyVx01wx2wqRl7EuGWnOILTQXzEzByn012VL4/thumbnail.jpg?width=540&height=960&fit_mode=smartcrop&time=1",
    captionsUrl: null,
    sortOrder: 6,
    publicationStatus: "published",
    accessibleLabel: "Testimonial 6, portrait video testimonial",
  },
] as const

export const VIDEO_TESTIMONIALS_SECTION = {
  eyebrow: "TESTIMONIALS",
  title: "Real experiences. Meaningful change.",
  subtitle:
    "Hear from people who have experienced Elevate’s practices, programs and events.",
  id: "testimonials",
} as const

/** Expected source inventory count for the allowlisted upload script. */
export const HOMEPAGE_TESTIMONIAL_SOURCE_COUNT = 6
