import { cn } from "@/lib/utils"

type EnquiryNextStepsProps = {
  steps: readonly string[]
  headingId?: string
  className?: string
}

function EnquiryNextSteps({
  steps,
  headingId = "enquiry-next-steps-heading",
  className,
}: EnquiryNextStepsProps) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "mt-6 rounded-2xl border border-line bg-green/5 p-5 sm:p-6",
        className
      )}
    >
      <h2
        id={headingId}
        className="font-display text-lg font-medium text-ink"
      >
        What happens next
      </h2>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={step} className="flex items-start gap-3 text-sm text-ink-soft">
            <span
              aria-hidden
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-blue ring-1 ring-line"
            >
              {index + 1}
            </span>
            <span className="pt-1">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export { EnquiryNextSteps, type EnquiryNextStepsProps }
