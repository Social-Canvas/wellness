import { Badge } from "@/components/ui"
import type { Video } from "@/features/videos/types"

interface MigrationStatusBadgeProps {
  video: Pick<Video, "migration_status">
}

export function MigrationStatusBadge({ video }: MigrationStatusBadgeProps) {
  switch (video.migration_status) {
    case "verified":
      return <Badge variant="plan">Verified</Badge>
    case "uploaded":
      return <Badge variant="secondary">Uploaded</Badge>
    case "failed":
      return <Badge variant="destructive">Failed</Badge>
    default:
      return <Badge variant="outline">Not started</Badge>
  }
}
