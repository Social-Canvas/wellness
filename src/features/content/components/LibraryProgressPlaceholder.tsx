export function LibraryProgressPlaceholder() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-ink-soft">
        <span>Progress</span>
        <span>Coming soon</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-cream2"
        aria-hidden="true"
      >
        <div className="h-full w-0 rounded-full bg-blue/40" />
      </div>
    </div>
  )
}
