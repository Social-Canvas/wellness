import * as React from "react"

import { cn } from "@/lib/utils"

type TickerProps = React.ComponentProps<"div"> & {
  children: React.ReactNode
}

function Ticker({ className, children, ...props }: TickerProps) {
  return (
    <div
      data-slot="ticker"
      className={cn(
        "bg-green-deep px-(--spacing-wrap-x) py-[7px] text-center font-body text-[13px] text-white",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Ticker }
