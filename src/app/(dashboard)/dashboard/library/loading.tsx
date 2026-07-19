export default function LibraryLoading() {
  return (
    <div className="mt-9 space-y-6 animate-pulse" aria-busy="true" aria-label="Loading library">
      <div className="space-y-2">
        <div className="h-4 w-24 rounded-md bg-line/60" />
        <div className="h-8 w-56 rounded-md bg-line/80" />
        <div className="h-4 w-80 max-w-full rounded-md bg-line/60" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="aspect-[4/3] rounded-2xl border border-line bg-surface"
          />
        ))}
      </div>
    </div>
  )
}
