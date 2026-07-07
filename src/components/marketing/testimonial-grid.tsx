import * as React from "react"

import { Container } from "@/components/layout/container"
import { Section } from "@/components/layout/section"
import { SectionHeader } from "@/components/layout/section-header"

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
      <Container className="text-center">
        <SectionHeader align="center" eyebrow={eyebrow} title={title} />

        <div className="mt-10 grid grid-cols-1 gap-[18px] text-left min-[861px]:grid-cols-3">
          {testimonials.map((testimonial) => (
            <blockquote
              key={testimonial.cite}
              className="rounded-2xl border border-line bg-surface p-[26px]"
            >
              <p className="text-[15px] italic text-ink">{testimonial.quote}</p>
              <cite className="mt-3.5 block text-[13px] font-bold not-italic text-blue">
                {testimonial.cite}
              </cite>
            </blockquote>
          ))}
        </div>
      </Container>
    </Section>
  )
}

export { TestimonialGrid, type Testimonial, type TestimonialGridProps }
