import * as React from "react"

import { BrandImage } from "@/components/media"
import { Container } from "@/components/layout/container"
import { Section } from "@/components/layout/section"
import { SectionHeader } from "@/components/layout/section-header"
import { BRAND_IMAGES } from "@/lib/brand/images"

type Testimonial = {
  quote: string
  cite: string
}

type TestimonialGridProps = React.ComponentProps<"section"> & {
  eyebrow?: string
  title: string
  testimonials: Testimonial[]
}

function TestimonialGrid({
  className,
  eyebrow,
  title,
  testimonials,
  ...props
}: TestimonialGridProps) {
  return (
    <Section variant="soft" className={className} {...props}>
      <Container>
        <div className="grid items-center gap-10 min-[861px]:grid-cols-[0.9fr_1.1fr]">
          <BrandImage
            image={BRAND_IMAGES.coachingConsultation}
            containerClassName="aspect-[4/5] w-full overflow-hidden rounded-2xl border border-line shadow-sm"
            sizes="(max-width: 860px) 100vw, 40vw"
          />

          <div className="text-center min-[861px]:text-left">
            <SectionHeader align="left" eyebrow={eyebrow} title={title} />

            <div className="mt-10 grid grid-cols-1 gap-[18px] text-left">
              {testimonials.map((testimonial) => (
                <blockquote
                  key={testimonial.cite}
                  className="rounded-2xl border border-line bg-surface p-[26px] shadow-sm"
                >
                  <p className="text-[15px] italic text-ink">{testimonial.quote}</p>
                  <cite className="mt-3.5 block text-[13px] font-bold not-italic text-blue">
                    {testimonial.cite}
                  </cite>
                </blockquote>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  )
}

export { TestimonialGrid, type Testimonial, type TestimonialGridProps }
