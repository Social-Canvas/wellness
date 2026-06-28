"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"

import {
  Button,
  Dialog,
  DialogBackdrop,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  Input,
  Label,
} from "@/components/ui"
import { updateVideoAction } from "@/features/videos/actions/videos.actions"
import { updateVideoSchema, type UpdateVideoInput } from "@/features/videos/schemas"
import type { Video } from "@/features/videos/types"

import {
  MIGRATION_STATUS_OPTIONS,
  VIDEO_STATUS_OPTIONS,
  videoSelectClassName,
  videoTextareaClassName,
} from "./video-form-styles"

interface EditVideoDialogProps {
  video: Video | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditVideoDialog({ video, open, onOpenChange }: EditVideoDialogProps) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<UpdateVideoInput>({
    resolver: zodResolver(updateVideoSchema),
    defaultValues: {
      title: "",
      description: "",
      durationSeconds: null,
      thumbnailUrl: "",
      muxAssetId: "",
      muxPlaybackId: "",
      status: "draft",
      migrationStatus: "not_started",
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form

  useEffect(() => {
    if (!video) {
      return
    }

    reset({
      title: video.title,
      description: video.description ?? "",
      durationSeconds: video.duration_seconds,
      thumbnailUrl: video.thumbnail_url ?? "",
      muxAssetId: video.mux_asset_id ?? "",
      muxPlaybackId: video.mux_playback_id ?? "",
      status: video.status,
      migrationStatus: video.migration_status,
    })
  }, [video, reset])

  async function onSubmit(values: UpdateVideoInput) {
    if (!video) {
      return
    }

    setFormError(null)

    const result = await updateVideoAction(video.id, {
      ...values,
      description: values.description ?? null,
      thumbnailUrl: values.thumbnailUrl ?? null,
      muxAssetId: values.muxAssetId ?? null,
      muxPlaybackId: values.muxPlaybackId ?? null,
      durationSeconds:
        values.durationSeconds === null || Number.isNaN(values.durationSeconds)
          ? null
          : values.durationSeconds,
    })

    if (!result.success) {
      setFormError(result.error.message)
      return
    }

    onOpenChange(false)
    router.refresh()
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setFormError(null)
    }

    onOpenChange(nextOpen)
  }

  if (!video) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-xl">
          <DialogTitle>Edit video</DialogTitle>
          <DialogDescription>Update video details for {video.title}.</DialogDescription>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            {formError ? (
              <p
                role="alert"
                className="rounded-[var(--radius-input)] border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {formError}
              </p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="edit-video-title">Title</Label>
              <Input
                id="edit-video-title"
                aria-invalid={Boolean(errors.title)}
                disabled={isSubmitting}
                {...register("title")}
              />
              {errors.title ? (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-video-description">Description</Label>
              <textarea
                id="edit-video-description"
                className={videoTextareaClassName}
                aria-invalid={Boolean(errors.description)}
                disabled={isSubmitting}
                {...register("description")}
              />
              {errors.description ? (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-video-duration">Duration (seconds)</Label>
                <Input
                  id="edit-video-duration"
                  type="number"
                  min={0}
                  aria-invalid={Boolean(errors.durationSeconds)}
                  disabled={isSubmitting}
                  {...register("durationSeconds", {
                    setValueAs: (value) =>
                      value === "" || value === null ? null : Number(value),
                  })}
                />
                {errors.durationSeconds ? (
                  <p className="text-sm text-destructive">
                    {errors.durationSeconds.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-video-thumbnail">Thumbnail URL</Label>
                <Input
                  id="edit-video-thumbnail"
                  type="url"
                  aria-invalid={Boolean(errors.thumbnailUrl)}
                  disabled={isSubmitting}
                  {...register("thumbnailUrl")}
                />
                {errors.thumbnailUrl ? (
                  <p className="text-sm text-destructive">{errors.thumbnailUrl.message}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-video-mux-asset">Mux asset ID</Label>
                <Input
                  id="edit-video-mux-asset"
                  aria-invalid={Boolean(errors.muxAssetId)}
                  disabled={isSubmitting}
                  {...register("muxAssetId")}
                />
                {errors.muxAssetId ? (
                  <p className="text-sm text-destructive">{errors.muxAssetId.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-video-mux-playback">Mux playback ID</Label>
                <Input
                  id="edit-video-mux-playback"
                  aria-invalid={Boolean(errors.muxPlaybackId)}
                  disabled={isSubmitting}
                  {...register("muxPlaybackId")}
                />
                {errors.muxPlaybackId ? (
                  <p className="text-sm text-destructive">
                    {errors.muxPlaybackId.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-video-status">Status</Label>
                <select
                  id="edit-video-status"
                  className={videoSelectClassName}
                  aria-invalid={Boolean(errors.status)}
                  disabled={isSubmitting}
                  {...register("status")}
                >
                  {VIDEO_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.status ? (
                  <p className="text-sm text-destructive">{errors.status.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-video-migration">Migration status</Label>
                <select
                  id="edit-video-migration"
                  className={videoSelectClassName}
                  aria-invalid={Boolean(errors.migrationStatus)}
                  disabled={isSubmitting}
                  {...register("migrationStatus")}
                >
                  {MIGRATION_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.migrationStatus ? (
                  <p className="text-sm text-destructive">
                    {errors.migrationStatus.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
