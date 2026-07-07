import * as React from "react"

import { Container } from "@/components/layout/container"
import { Section } from "@/components/layout/section"
import { SectionHeader } from "@/components/layout/section-header"

type StepItem = {
  number: string
  title: string
  description: string
}

type StepsGridProps = React.ComponentProps<"section"> & {
  eyebrow?: string
  title: string
  steps: StepItem[]
}

function StepsGrid({
  className,
  eyebrow,
  title,
  steps,
  ...props
}: StepsGridProps) {
  return (
    <Section variant="muted" className={className} {...props}>
      <Container className="text-center">
        <SectionHeader align="center" eyebrow={eyebrow} title={title} />

        <div className="mt-10 grid grid-cols-1 gap-[22px] text-left min-[861px]:grid-cols-3">
          {steps.map((step) => (
            <article
              key={step.number}
              className="rounded-2xl border border-line bg-surface px-6 py-[26px]"
            >
              <div className="font-display text-[40px] text-green">{step.number}</div>
              <h3 className="mt-2 font-display text-[19px] font-medium text-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-ink-soft">{step.description}</p>
            </article>
          ))}
        </div>
      </Container>
    </Section>
  )
}

export { StepsGrid, type StepItem, type StepsGridProps }
