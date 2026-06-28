"use client"

import { useState } from "react"

import {
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui"
import type { Video } from "@/features/videos/types"

import { ArchiveVideoDialog } from "./ArchiveVideoDialog"
import { CreateVideoDialog } from "./CreateVideoDialog"
import { EditVideoDialog } from "./EditVideoDialog"
import { MigrationStatusBadge } from "./MigrationStatusBadge"
import { VideoCard } from "./VideoCard"
import { VideoStatusBadge } from "./VideoStatusBadge"
import { formatVideoDuration, truncateId } from "./video-form-styles"

interface VideosTableProps {
  videos: Video[]
}

function VideoRowActions({
  video,
  onEdit,
  onArchive,
}: {
  video: Video
  onEdit: (video: Video) => void
  onArchive: (video: Video) => void
}) {
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => onEdit(video)}>
        Edit
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={video.status === "archived"}
        onClick={() => onArchive(video)}
      >
        Archive
      </Button>
    </>
  )
}

export function VideosTable({ videos }: VideosTableProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editVideo, setEditVideo] = useState<Video | null>(null)
  const [archiveVideo, setArchiveVideo] = useState<Video | null>(null)

  if (videos.length === 0) {
    return (
      <>
        <div className="rounded-2xl border border-dashed border-line bg-cream2/50 px-6 py-10 text-center">
          <p className="font-display text-lg font-medium text-ink">No videos yet</p>
          <p className="mt-2 text-sm text-ink-soft">
            Create your first video record to get started.
          </p>
          <div className="mt-5">
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Create video
            </Button>
          </div>
        </div>

        <CreateVideoDialog open={createOpen} onOpenChange={setCreateOpen} />
      </>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          {videos.length} video{videos.length === 1 ? "" : "s"}
        </p>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Create video
        </Button>
      </div>

      <Card className="mt-4 hidden lg:block">
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Mux Asset ID</TableHead>
                <TableHead>Playback ID</TableHead>
                <TableHead>Migration Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos.map((video) => (
                <TableRow key={video.id}>
                  <TableCell className="font-medium">{video.title}</TableCell>
                  <TableCell>
                    <VideoStatusBadge video={video} />
                  </TableCell>
                  <TableCell>{formatVideoDuration(video.duration_seconds)}</TableCell>
                  <TableCell className="font-mono text-xs text-ink-soft">
                    {truncateId(video.mux_asset_id, 16)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-ink-soft">
                    {truncateId(video.mux_playback_id, 16)}
                  </TableCell>
                  <TableCell>
                    <MigrationStatusBadge video={video} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <VideoRowActions
                        video={video}
                        onEdit={setEditVideo}
                        onArchive={setArchiveVideo}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:hidden">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            actions={
              <VideoRowActions
                video={video}
                onEdit={setEditVideo}
                onArchive={setArchiveVideo}
              />
            }
          />
        ))}
      </div>

      <CreateVideoDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditVideoDialog
        video={editVideo}
        open={Boolean(editVideo)}
        onOpenChange={(open) => {
          if (!open) {
            setEditVideo(null)
          }
        }}
      />
      <ArchiveVideoDialog
        video={archiveVideo}
        open={Boolean(archiveVideo)}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveVideo(null)
          }
        }}
      />
    </>
  )
}
