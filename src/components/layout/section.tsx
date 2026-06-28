import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const sectionVariants = cva("", {
  variants: {
    variant: {
      default: "bg-transparent",
      muted: "bg-cream2",
      soft: "bg-blue-soft",
      primary: "bg-blue text-white",
      inverse: "bg-ink text-cream",
      green: "bg-green-deep text-white",
    },
    padding: {
      default: "py-(--spacing-section)",
      hero: "pt-[3.625rem] pb-[2.875rem]",
      dashboard: "pt-[2.375rem] pb-[4.375rem]",
      none: "py-0",
    },
  },
  defaultVariants: {
    variant: "default",
    padding: "default",
  },
})

function Section({
  className,
  variant,
  padding,
  ...props
}: React.ComponentProps<"section"> & VariantProps<typeof sectionVariants>) {
  return (
    <section
      data-slot="section"
      className={cn(sectionVariants({ variant, padding }), className)}
      {...props}
    />
  )
}

export { Section, sectionVariants }
