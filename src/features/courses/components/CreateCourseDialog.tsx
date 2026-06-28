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
import { createCourseAction } from "@/features/courses/actions/courses.actions"
import { createCourseSchema, type CreateCourseInput } from "@/features/courses/schemas"

import {
  courseSelectClassName,
  courseTextareaClassName,
  PUBLISH_STATUS_OPTIONS,
} from "./course-form-styles"

interface CreateCourseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateCourseDialog({ open, onOpenChange }: CreateCourseDialogProps) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<CreateCourseInput>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      thumbnailUrl: "",
      certificateEnabled: false,
      completionThreshold: 90,
      sortOrder: 0,
      status: "draft",
      publishedAt: "",
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form

  async function onSubmit(values: CreateCourseInput) {
    setFormError(null)

    const result = await createCourseAction({
      ...values,
      description: values.description || null,
      thumbnailUrl: values.thumbnailUrl || null,
      publishedAt: values.publishedAt || null,
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
          <DialogTitle>Create course</DialogTitle>
          <DialogDescription>
            Add a course shell. Modules and lessons can be added later.
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
              <Label htmlFor="create-course-title">Title</Label>
              <Input
                id="create-course-title"
                aria-invalid={Boolean(errors.title)}
                disabled={isSubmitting}
                {...register("title")}
              />
              {errors.title ? (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-course-slug">Slug</Label>
              <Input
                id="create-course-slug"
                aria-invalid={Boolean(errors.slug)}
                disabled={isSubmitting}
                {...register("slug")}
              />
              {errors.slug ? (
                <p className="text-sm text-destructive">{errors.slug.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-course-description">Description</Label>
              <textarea
                id="create-course-description"
                className={courseTextareaClassName}
                aria-invalid={Boolean(errors.description)}
                disabled={isSubmitting}
                {...register("description")}
              />
              {errors.description ? (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-course-thumbnail">Thumbnail URL</Label>
              <Input
                id="create-course-thumbnail"
                type="url"
                aria-invalid={Boolean(errors.thumbnailUrl)}
                disabled={isSubmitting}
                {...register("thumbnailUrl")}
              />
              {errors.thumbnailUrl ? (
                <p className="text-sm text-destructive">{errors.thumbnailUrl.message}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-course-completion">Completion threshold (%)</Label>
                <Input
                  id="create-course-completion"
                  type="number"
                  min={1}
                  max={100}
                  aria-invalid={Boolean(errors.completionThreshold)}
                  disabled={isSubmitting}
                  {...register("completionThreshold", { valueAsNumber: true })}
                />
                {errors.completionThreshold ? (
                  <p className="text-sm text-destructive">
                    {errors.completionThreshold.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-course-sort-order">Sort order</Label>
                <Input
                  id="create-course-sort-order"
                  type="number"
                  min={0}
                  aria-invalid={Boolean(errors.sortOrder)}
                  disabled={isSubmitting}
                  {...register("sortOrder", { valueAsNumber: true })}
                />
                {errors.sortOrder ? (
                  <p className="text-sm text-destructive">{errors.sortOrder.message}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-course-status">Status</Label>
                <select
                  id="create-course-status"
                  className={courseSelectClassName}
                  aria-invalid={Boolean(errors.status)}
                  disabled={isSubmitting}
                  {...register("status")}
                >
                  {PUBLISH_STATUS_OPTIONS.map((option) => (
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
                <Label htmlFor="create-course-published-at">Published at</Label>
                <Input
                  id="create-course-published-at"
                  type="datetime-local"
                  aria-invalid={Boolean(errors.publishedAt)}
                  disabled={isSubmitting}
                  {...register("publishedAt")}
                />
                {errors.publishedAt ? (
                  <p className="text-sm text-destructive">{errors.publishedAt.message}</p>
                ) : null}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                className="size-4 rounded border-line"
                disabled={isSubmitting}
                {...register("certificateEnabled")}
              />
              Certificate enabled
            </label>

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
                {isSubmitting ? "Creating…" : "Create course"}
              </Button>
            </div>
          </form>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
