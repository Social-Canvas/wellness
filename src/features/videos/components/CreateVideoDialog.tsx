"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
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
import { createVideoAction } from "@/features/videos/actions/videos.actions"
import { createVideoSchema, type CreateVideoInput } from "@/features/videos/schemas"

import {
  MIGRATION_STATUS_OPTIONS,
  VIDEO_STATUS_OPTIONS,
  videoSelectClassName,
  videoTextareaClassName,
} from "./video-form-styles"

interface CreateVideoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateVideoDialog({ open, onOpenChange }: CreateVideoDialogProps) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<CreateVideoInput>({
    resolver: zodResolver(createVideoSchema),
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

  async function onSubmit(values: CreateVideoInput) {
    setFormError(null)

    const result = await createVideoAction({
      ...values,
      description: values.description || null,
      thumbnailUrl: values.thumbnailUrl || null,
      muxAssetId: values.muxAssetId || null,
      muxPlaybackId: values.muxPlaybackId || null,
      durationSeconds:
        values.durationSeconds === null || Number.isNaN(values.durationSeconds)
          ? null
          : values.durationSeconds,
    })

    if (!result.success) {
      setFormError(result.error.message)
      return
    }

    reset()
    onOpenChange(false)
    router.refresh()
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      reset()
      setFormError(null)
    }

    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-xl">
          <DialogTitle>Create video</DialogTitle>
          <DialogDescription>
            Add a video record manually. Upload and Mux sync come later.
          </DialogDescription>

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
              <Label htmlFor="create-video-title">Title</Label>
              <Input
                id="create-video-title"
                aria-invalid={Boolean(errors.title)}
                disabled={isSubmitting}
                {...register("title")}
              />
              {errors.title ? (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-video-description">Description</Label>
              <textarea
                id="create-video-description"
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
                <Label htmlFor="create-video-duration">Duration (seconds)</Label>
                <Input
                  id="create-video-duration"
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
                <Label htmlFor="create-video-thumbnail">Thumbnail URL</Label>
                <Input
                  id="create-video-thumbnail"
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
                <Label htmlFor="create-video-mux-asset">Mux asset ID</Label>
                <Input
                  id="create-video-mux-asset"
                  aria-invalid={Boolean(errors.muxAssetId)}
                  disabled={isSubmitting}
                  {...register("muxAssetId")}
                />
                {errors.muxAssetId ? (
                  <p className="text-sm text-destructive">{errors.muxAssetId.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-video-mux-playback">Mux playback ID</Label>
                <Input
                  id="create-video-mux-playback"
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
                <Label htmlFor="create-video-status">Status</Label>
                <select
                  id="create-video-status"
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
                <Label htmlFor="create-video-migration">Migration status</Label>
                <select
                  id="create-video-migration"
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
                {isSubmitting ? "Creating…" : "Create video"}
              </Button>
            </div>
          </form>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
