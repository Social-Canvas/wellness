export const productSelectClassName =
  "h-auto w-full rounded-[var(--radius-input)] border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export const productTextareaClassName =
  "min-h-[120px] w-full rounded-[var(--radius-input)] border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

export const PRODUCT_TYPE_OPTIONS = [
  { value: "ebook", label: "Ebook" },
  { value: "digital_download", label: "Digital download" },
  { value: "bundle", label: "Bundle" },
  { value: "masterclass", label: "Masterclass" },
  { value: "session", label: "Session" },
] as const

export const PRODUCT_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const
