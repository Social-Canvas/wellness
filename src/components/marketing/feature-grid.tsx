import * as React from "react"

import { Container } from "@/components/layout/container"
import { Section } from "@/components/layout/section"
import { SectionHeader } from "@/components/layout/section-header"

type FeatureGridItem = {
  title: string
  icon?: React.ReactNode
}

type FeatureGridProps = React.ComponentProps<"section"> & {
  eyebrow?: string
  title: string
  subtitle?: string
  items: FeatureGridItem[]
  sectionVariant?: "default" | "muted"
}

function FeatureGrid({
  className,
  eyebrow,
  title,
  subtitle,
  items,
  sectionVariant = "default",
  ...props
}: FeatureGridProps) {
  return (
    <Section
      variant={sectionVariant === "muted" ? "muted" : "default"}
      className={className}
      {...props}
    >
      <Container className="text-center">
        <SectionHeader
          align="center"
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
        />

        <div className="mt-10 grid grid-cols-2 gap-4 min-[861px]:grid-cols-4">
          {items.map((item, index) => (
            <div
              key={`${item.title}-${index}`}
              className="rounded-[14px] border border-line bg-surface px-[22px] py-[22px] text-center"
            >
              <div
                aria-hidden
                className="mx-auto mb-2.5 flex size-9 items-center justify-center rounded-full bg-green-soft font-bold text-green-deep"
              >
                {item.icon ?? "✦"}
              </div>
              <h4 className="font-display text-[15px] font-medium leading-snug text-ink">
                {item.title}
              </h4>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  )
}

export { FeatureGrid, type FeatureGridItem, type FeatureGridProps }
