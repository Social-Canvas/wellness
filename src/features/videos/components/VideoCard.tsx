import type { ReactNode } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import type { Video } from "@/features/videos/types"

import { formatVideoDuration, truncateId } from "./video-form-styles"
import { MigrationStatusBadge } from "./MigrationStatusBadge"
import { VideoStatusBadge } from "./VideoStatusBadge"

interface VideoCardProps {
  video: Video
  actions?: ReactNode
}

export function VideoCard({ video, actions }: VideoCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="font-display text-lg font-medium">
            {video.title}
          </CardTitle>
          <p className="mt-1 text-sm text-ink-soft">
            Duration: {formatVideoDuration(video.duration_seconds)}
          </p>
        </div>
        <VideoStatusBadge video={video} />
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-ink-soft">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Mux asset
            </p>
            <p className="mt-1 font-medium text-ink">
              {truncateId(video.mux_asset_id, 16)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Playback ID
            </p>
            <p className="mt-1 font-medium text-ink">
              {truncateId(video.mux_playback_id, 16)}
            </p>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Migration
          </p>
          <div className="mt-1">
            <MigrationStatusBadge video={video} />
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
      </CardContent>
    </Card>
  )
}
