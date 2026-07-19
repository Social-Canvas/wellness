export default function LessonLibraryLoading() {
  return (
    <div className="mt-9 space-y-6 animate-pulse" aria-busy="true" aria-label="Loading lesson">
      <div className="space-y-2">
        <div className="h-4 w-28 rounded-md bg-line/60" />
        <div className="h-8 w-72 max-w-full rounded-md bg-line/80" />
        <div className="h-4 w-48 rounded-md bg-line/60" />
      </div>
      <div className="aspect-video w-full rounded-2xl border border-line bg-surface" />
      <div className="space-y-2">
        <div className="h-4 w-full max-w-2xl rounded-md bg-line/60" />
        <div className="h-4 w-full max-w-xl rounded-md bg-line/60" />
      </div>
    </div>
  )
}
