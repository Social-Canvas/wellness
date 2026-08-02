import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type EnquiryPageShellProps = {
  hero: ReactNode
  summary: ReactNode
  form: ReactNode
  className?: string
  /** Sticky left column on desktop (accounts for sticky navbar offset). */
  stickySummary?: boolean
}

function EnquiryPageShell({
  hero,
  summary,
  form,
  className,
  stickySummary = false,
}: EnquiryPageShellProps) {
  return (
    <main className={cn("overflow-x-hidden", className)}>
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-12 sm:px-6 sm:pt-10 sm:pb-16 lg:px-8">
        <header className="max-w-2xl">{hero}</header>

        <div className="mt-8 grid grid-cols-1 items-start gap-8 min-[900px]:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] min-[900px]:gap-10 lg:gap-12">
          <aside
            className={cn(
              "min-w-0",
              stickySummary && "min-[900px]:sticky min-[900px]:top-24"
            )}
          >
            {summary}
          </aside>

          <div className="min-w-0">{form}</div>
        </div>
      </div>
    </main>
  )
}

export { EnquiryPageShell, type EnquiryPageShellProps }
