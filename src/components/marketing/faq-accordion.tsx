"use client"

import * as React from "react"

import { Container } from "@/components/layout/container"
import { Section } from "@/components/layout/section"
import { SectionHeader } from "@/components/layout/section-header"
import { cn } from "@/lib/utils"

type FaqItem = {
  question: string
  answer: string
}

type FaqAccordionProps = React.ComponentProps<"section"> & {
  eyebrow?: string
  title: string
  items: FaqItem[]
}

function FaqAccordion({
  className,
  eyebrow,
  title,
  items,
  ...props
}: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null)

  return (
    <Section variant="muted" className={className} {...props}>
      <Container>
        <SectionHeader align="center" eyebrow={eyebrow} title={title} />

        <div className="mx-auto mt-10 max-w-[760px]">
          {items.map((item, index) => {
            const isOpen = openIndex === index

            return (
              <div
                key={item.question}
                className="mb-2.5 overflow-hidden rounded-xl border border-line bg-surface"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-3.5 px-[22px] py-[18px] text-left font-body text-[15.5px] font-bold text-ink"
                >
                  {item.question}
                  <span
                    aria-hidden
                    className={cn(
                      "text-[22px] text-blue transition-transform duration-250",
                      isOpen && "rotate-45"
                    )}
                  >
                    +
                  </span>
                </button>
                <div
                  className={cn(
                    "overflow-hidden transition-[max-height] duration-300",
                    isOpen ? "max-h-96" : "max-h-0"
                  )}
                >
                  <div className="px-[22px] pb-5 text-sm text-ink-soft">
                    {item.answer}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Container>
    </Section>
  )
}

export { FaqAccordion, type FaqAccordionProps, type FaqItem }
