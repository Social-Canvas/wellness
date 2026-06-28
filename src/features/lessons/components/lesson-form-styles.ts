import { cn } from "@/lib/utils"

export const lessonTextareaClassName = cn(
  "min-h-24 w-full min-w-0 rounded-[var(--radius-input)] border border-line bg-surface px-3.5 py-3 font-body text-[15px] text-ink transition-colors outline-none placeholder:text-ink-soft/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-cream2 disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
)

export const lessonSelectClassName = cn(
  "h-auto min-h-10 w-full min-w-0 rounded-[var(--radius-input)] border border-line bg-surface px-3.5 py-3 font-body text-[15px] text-ink transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-cream2 disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
)

export const PUBLISH_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const
