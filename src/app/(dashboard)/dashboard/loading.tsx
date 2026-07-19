export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading dashboard">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-md bg-line/80" />
        <div className="h-4 w-72 max-w-full rounded-md bg-line/60" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-40 rounded-2xl border border-line bg-surface"
          />
        ))}
      </div>
    </div>
  )
}
