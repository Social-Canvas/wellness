import { HOMEPAGE_VIDEO_TESTIMONIALS } from "../data/testimonials"
import type { HomepageVideoTestimonial } from "../types"
import { getCarouselTestimonials } from "../utils/testimonials"
import { VideoTestimonialsCarousel } from "./video-testimonials-carousel"

/**
 * Public homepage testimonials section.
 * Renders published Mux testimonials when ready; otherwise draft placeholders
 * so layout/a11y can be verified without inventing identities or publishing
 * without consent.
 */
export function VideoTestimonialsSection({
  className,
  testimonials: testimonialItems,
  section,
}: {
  className?: string
  testimonials?: readonly HomepageVideoTestimonial[]
  section?: { eyebrow: string; title: string; subtitle: string }
}) {
  const testimonials = getCarouselTestimonials(
    testimonialItems ?? HOMEPAGE_VIDEO_TESTIMONIALS,
    {
      includeDraftPlaceholders: true,
    }
  )

  if (testimonials.length === 0) {
    return null
  }

  return (
    <VideoTestimonialsCarousel
      testimonials={testimonials}
      className={className}
      section={section}
    />
  )
}
