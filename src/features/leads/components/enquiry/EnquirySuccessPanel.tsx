"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type EnquirySuccessPanelProps = {
  heading: string
  body: string
  isAuthenticated: boolean
  className?: string
}

function EnquirySuccessPanel({
  heading,
  body,
  isAuthenticated,
  className,
}: EnquirySuccessPanelProps) {
  const successRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    successRef.current?.focus()
  }, [])

  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <h2
        ref={successRef}
        tabIndex={-1}
        className="font-display text-2xl font-medium text-ink outline-none"
      >
        {heading}
      </h2>
      <p className="mt-3 text-sm text-ink-soft sm:text-base">{body}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/programs"
          className={cn(buttonVariants({ variant: "default" }), "justify-center")}
        >
          Return to Programs
        </Link>
        {isAuthenticated ? (
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "justify-center"
            )}
          >
            Go to Dashboard
          </Link>
        ) : null}
      </div>
    </div>
  )
}

export { EnquirySuccessPanel, type EnquirySuccessPanelProps }
