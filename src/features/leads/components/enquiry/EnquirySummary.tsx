import type { ReactNode } from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"

type EnquirySummaryProps = {
  heading: string
  label?: string
  description?: string
  benefits: readonly string[]
  headingId?: string
  linkHref?: string
  linkLabel?: string
  className?: string
  children?: ReactNode
}

function EnquirySummary({
  heading,
  label,
  description,
  benefits,
  headingId = "enquiry-summary-heading",
  linkHref,
  linkLabel,
  className,
  children,
}: EnquirySummaryProps) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6",
        className
      )}
    >
      {children}
      {label ? (
        <p className="text-[11px] font-bold tracking-[0.12em] text-green-deep uppercase">
          {label}
        </p>
      ) : null}
      <h2
        id={headingId}
        className={cn(
          "font-display text-xl font-medium text-ink sm:text-2xl",
          label ? "mt-1.5" : undefined
        )}
      >
        {heading}
      </h2>
      {description ? (
        <p className="mt-1 text-sm text-ink-soft">{description}</p>
      ) : null}

      <ul className="mt-5 space-y-2">
        {benefits.map((benefit) => (
          <li
            key={benefit}
            className="flex items-start gap-2 text-sm text-ink-soft"
          >
            <span
              aria-hidden
              className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-blue/10 text-[10px] font-bold text-blue"
            >
              ✓
            </span>
            <span>{benefit}</span>
          </li>
        ))}
      </ul>

      {linkHref && linkLabel ? (
        <Link
          href={linkHref}
          className="mt-5 inline-flex text-sm font-semibold text-blue underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2"
        >
          {linkLabel}
        </Link>
      ) : null}
    </section>
  )
}

export { EnquirySummary, type EnquirySummaryProps }
