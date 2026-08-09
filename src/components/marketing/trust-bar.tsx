import * as React from "react"

import { cn } from "@/lib/utils"

type TrustBarProps = React.ComponentProps<"div"> & {
  items: string[]
}

function TrustBar({ className, items, ...props }: TrustBarProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <div
      data-slot="trust-bar"
      className={cn(
        "flex flex-wrap items-center gap-2 border-t border-line pt-5",
        className
      )}
      {...props}
    >
      {items.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className="rounded-full border border-line bg-green-soft/70 px-3.5 py-1.5 font-body text-[12.5px] font-semibold text-green-deep"
        >
          {item}
        </span>
      ))}
    </div>
  )
}

export { TrustBar, type TrustBarProps }
