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
        "flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-5",
        className
      )}
      {...props}
    >
      {items.map((item, index) => (
        <React.Fragment key={`${item}-${index}`}>
          {index > 0 ? (
            <span aria-hidden className="font-semibold text-[13px] text-blue">
              ·
            </span>
          ) : null}
          <span className="font-body text-[13px] font-semibold text-ink-soft">
            {item}
          </span>
        </React.Fragment>
      ))}
    </div>
  )
}

export { TrustBar, type TrustBarProps }
