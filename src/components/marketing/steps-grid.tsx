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

        <ol className="mt-10 grid grid-cols-1 gap-[22px] text-left min-[861px]:grid-cols-3">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1
            return (
              <li key={step.number} className="relative list-none">
                {!isLast ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute top-[calc(1.625rem+22px)] left-[calc(50%+1.4rem)] z-0 hidden h-px w-[calc(100%-1.4rem)] bg-green/35 min-[861px]:block"
                  />
                ) : null}
                <article className="relative z-10 rounded-2xl border border-line bg-surface px-6 py-[26px]">
                  <div className="flex size-11 items-center justify-center rounded-full border-2 border-green bg-green-soft font-display text-[22px] leading-none text-green-deep">
                    <span className="sr-only">Step </span>
                    {step.number}
                  </div>
                  <h3 className="mt-3 font-display text-[19px] font-medium text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-ink-soft">{step.description}</p>
                </article>
              </li>
            )
          })}
        </ol>
      </Container>
    </Section>
  )
}

export { StepsGrid, type StepItem, type StepsGridProps }
