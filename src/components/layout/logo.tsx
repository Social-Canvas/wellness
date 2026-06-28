import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const logoVariants = cva("font-display text-xl font-semibold tracking-tight", {
  variants: {
    variant: {
      default: "text-ink [&_[data-logo-accent]]:text-blue",
      footer: "text-[#C2D2D0] [&_[data-logo-accent]]:text-[#9FD0C9]",
      inverse: "text-cream [&_[data-logo-accent]]:text-blue-soft",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

type LogoProps = React.ComponentProps<"div"> &
  VariantProps<typeof logoVariants> & {
    accent: string
    suffix?: string
  }

function Logo({
  className,
  variant,
  accent,
  suffix,
  ...props
}: LogoProps) {
  return (
    <div
      data-slot="logo"
      className={cn(logoVariants({ variant }), className)}
      {...props}
    >
      <span data-logo-accent className="font-semibold">
        {accent}
      </span>
      {suffix ? <span className="font-semibold"> {suffix}</span> : null}
    </div>
  )
}

export { Logo, logoVariants }
