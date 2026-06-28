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
import { updateCourseAction } from "@/features/courses/actions/courses.actions"
import { updateCourseSchema, type UpdateCourseInput } from "@/features/courses/schemas"
import type { CourseWithPlanAccess } from "@/features/courses/types"

import {
  courseSelectClassName,
  courseTextareaClassName,
  PUBLISH_STATUS_OPTIONS,
} from "./course-form-styles"

interface EditCourseDialogProps {
  course: CourseWithPlanAccess | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditCourseDialog({
  course,
  open,
  onOpenChange,
}: EditCourseDialogProps) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<UpdateCourseInput>({
    resolver: zodResolver(updateCourseSchema),
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

  useEffect(() => {
    if (!course) {
      return
    }

    reset({
      title: course.title,
      slug: course.slug,
      description: course.description ?? "",
      thumbnailUrl: course.thumbnail_url ?? "",
      certificateEnabled: course.certificate_enabled,
      completionThreshold: course.completion_threshold,
      sortOrder: course.sort_order,
      status: course.status,
      publishedAt: "",
    })
  }, [course, reset])

  async function onSubmit(values: UpdateCourseInput) {
    if (!course) {
      return
    }

    setFormError(null)

    const result = await updateCourseAction(course.id, {
      ...values,
      description: values.description ?? null,
      thumbnailUrl: values.thumbnailUrl ?? null,
      publishedAt: values.publishedAt || null,
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

  if (!course) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-xl">
          <DialogTitle>Edit course</DialogTitle>
          <DialogDescription>Update course details for {course.title}.</DialogDescription>

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
              <Label htmlFor="edit-course-title">Title</Label>
              <Input
                id="edit-course-title"
                aria-invalid={Boolean(errors.title)}
                disabled={isSubmitting}
                {...register("title")}
              />
              {errors.title ? (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-course-slug">Slug</Label>
              <Input
                id="edit-course-slug"
                aria-invalid={Boolean(errors.slug)}
                disabled={isSubmitting}
                {...register("slug")}
              />
              {errors.slug ? (
                <p className="text-sm text-destructive">{errors.slug.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-course-description">Description</Label>
              <textarea
                id="edit-course-description"
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
              <Label htmlFor="edit-course-thumbnail">Thumbnail URL</Label>
              <Input
                id="edit-course-thumbnail"
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
                <Label htmlFor="edit-course-completion">Completion threshold (%)</Label>
                <Input
                  id="edit-course-completion"
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
                <Label htmlFor="edit-course-sort-order">Sort order</Label>
                <Input
                  id="edit-course-sort-order"
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
                <Label htmlFor="edit-course-status">Status</Label>
                <select
                  id="edit-course-status"
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
                <Label htmlFor="edit-course-published-at">Published at</Label>
                <Input
                  id="edit-course-published-at"
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
                {isSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
