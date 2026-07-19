export default function CourseLibraryLoading() {
  return (
    <div className="mt-9 space-y-6 animate-pulse" aria-busy="true" aria-label="Loading course">
      <div className="space-y-2">
        <div className="h-4 w-32 rounded-md bg-line/60" />
        <div className="h-8 w-64 max-w-full rounded-md bg-line/80" />
        <div className="h-4 w-full max-w-xl rounded-md bg-line/60" />
      </div>
      <div className="h-20 rounded-2xl border border-line bg-surface" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-14 rounded-2xl border border-line bg-surface"
          />
        ))}
      </div>
    </div>
  )
}
