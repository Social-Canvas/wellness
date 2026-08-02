import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type EnquiryFormCardProps = {
  children: ReactNode
  className?: string
  heading?: string
  support?: string
}

function EnquiryFormCard({
  children,
  className,
  heading,
  support,
}: EnquiryFormCardProps) {
  return (
    <div
      className={cn(
        "w-full max-w-[620px] rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8",
        className
      )}
    >
      {heading ? (
        <h2 className="font-display text-xl font-medium text-ink sm:text-2xl">
          {heading}
        </h2>
      ) : null}
      {support ? (
        <p className="mt-2 text-sm text-ink-soft sm:text-base">{support}</p>
      ) : null}
      {children}
    </div>
  )
}

export { EnquiryFormCard, type EnquiryFormCardProps }
