import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const sectionHeaderVariants = cva("flex flex-col", {
  variants: {
    align: {
      center: "items-center text-center",
      left: "items-start text-left",
    },
    tone: {
      default: "",
      light: "[&_[data-slot=section-title]]:text-white [&_[data-slot=section-subtitle]]:text-[#E2F0EF] [&_[data-slot=badge]]:text-[#9FD0C9]",
    },
  },
  defaultVariants: {
    align: "center",
    tone: "default",
  },
})

type SectionHeaderProps = React.ComponentProps<"div"> &
  VariantProps<typeof sectionHeaderVariants> & {
    eyebrow?: React.ReactNode
    title: React.ReactNode
    subtitle?: React.ReactNode
    titleAs?: "h1" | "h2" | "h3"
  }

function SectionHeader({
  className,
  align,
  tone,
  eyebrow,
  title,
  subtitle,
  titleAs: TitleTag = "h2",
  ...props
}: SectionHeaderProps) {
  return (
    <div
      data-slot="section-header"
      className={cn(sectionHeaderVariants({ align, tone }), className)}
      {...props}
    >
      {eyebrow ? (
        typeof eyebrow === "string" ? (
          <Badge variant="eyebrow">{eyebrow}</Badge>
        ) : (
          <div>{eyebrow}</div>
        )
      ) : null}

      <TitleTag
        data-slot="section-title"
        className="mt-3 font-display text-[clamp(1.5625rem,3.3vw,2.25rem)] font-medium tracking-tight text-ink"
      >
        {title}
      </TitleTag>

      {subtitle ? (
        <p
          data-slot="section-subtitle"
          className={cn(
            "mt-3.5 max-w-[36.25rem] text-base text-ink-soft",
            align === "center" && "mx-auto"
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  )
}

export { SectionHeader, sectionHeaderVariants }
