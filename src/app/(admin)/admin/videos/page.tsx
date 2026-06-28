import { listVideos } from "@/features/videos/services/videos.service"
import { VideosTable } from "@/features/videos/components"

export default async function AdminVideosPage() {
  const result = await listVideos()

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-[28px] font-medium text-ink">Videos</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Manage the video library and Mux metadata.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{result.error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[28px] font-medium text-ink">Videos</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Manage the video library and Mux metadata.
        </p>
      </div>

      <VideosTable videos={result.data} />
    </div>
  )
}
