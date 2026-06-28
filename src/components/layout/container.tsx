import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const containerVariants = cva("mx-auto w-full px-(--spacing-wrap-x)", {
  variants: {
    size: {
      default: "max-w-(--width-wrap)",
      narrow: "max-w-[32.5rem]",
      prose: "max-w-[46.25rem]",
      wide: "max-w-[51.25rem]",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

function Container({
  className,
  size,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof containerVariants>) {
  return (
    <div
      data-slot="container"
      className={cn(containerVariants({ size }), className)}
      {...props}
    />
  )
}

export { Container, containerVariants }
