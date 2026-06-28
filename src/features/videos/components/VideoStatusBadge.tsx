import { Badge } from "@/components/ui"
import type { Video } from "@/features/videos/types"

interface VideoStatusBadgeProps {
  video: Pick<Video, "status">
}

export function VideoStatusBadge({ video }: VideoStatusBadgeProps) {
  switch (video.status) {
    case "published":
      return <Badge variant="plan">Published</Badge>
    case "ready":
      return <Badge variant="plan">Ready</Badge>
    case "archived":
      return <Badge variant="outline">Archived</Badge>
    case "failed":
      return <Badge variant="destructive">Failed</Badge>
    case "uploading":
    case "processing":
      return <Badge variant="secondary">{video.status === "uploading" ? "Uploading" : "Processing"}</Badge>
    default:
      return <Badge variant="secondary">Draft</Badge>
  }
}
