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
import { updateLessonAction } from "@/features/lessons/actions/lessons.actions"
import { updateLessonSchema, type UpdateLessonInput } from "@/features/lessons/schemas"
import type { Lesson } from "@/features/lessons/types"

import {
  lessonSelectClassName,
  lessonTextareaClassName,
  PUBLISH_STATUS_OPTIONS,
} from "./lesson-form-styles"

interface EditLessonDialogProps {
  courseId: string
  moduleId: string
  lesson: Lesson | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditLessonDialog({
  courseId,
  moduleId,
  lesson,
  open,
  onOpenChange,
}: EditLessonDialogProps) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<UpdateLessonInput>({
    resolver: zodResolver(updateLessonSchema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      sortOrder: 0,
      isRequired: true,
      status: "draft",
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form

  useEffect(() => {
    if (!lesson) {
      return
    }

    reset({
      title: lesson.title,
      slug: lesson.slug,
      description: lesson.description ?? "",
      sortOrder: lesson.sort_order,
      isRequired: lesson.is_required,
      status: lesson.status,
    })
  }, [lesson, reset])

  async function onSubmit(values: UpdateLessonInput) {
    if (!lesson) {
      return
    }

    setFormError(null)

    const result = await updateLessonAction(courseId, moduleId, lesson.id, {
      ...values,
      description: values.description ?? null,
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

  if (!lesson) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-lg">
          <DialogTitle>Edit lesson</DialogTitle>
          <DialogDescription>Update lesson details for {lesson.title}.</DialogDescription>

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
              <Label htmlFor="edit-lesson-title">Title</Label>
              <Input
                id="edit-lesson-title"
                aria-invalid={Boolean(errors.title)}
                disabled={isSubmitting}
                {...register("title")}
              />
              {errors.title ? (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-lesson-slug">Slug</Label>
              <Input
                id="edit-lesson-slug"
                aria-invalid={Boolean(errors.slug)}
                disabled={isSubmitting}
                {...register("slug")}
              />
              {errors.slug ? (
                <p className="text-sm text-destructive">{errors.slug.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-lesson-description">Description</Label>
              <textarea
                id="edit-lesson-description"
                className={lessonTextareaClassName}
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
                <Label htmlFor="edit-lesson-sort-order">Sort order</Label>
                <Input
                  id="edit-lesson-sort-order"
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

              <div className="space-y-2">
                <Label htmlFor="edit-lesson-status">Status</Label>
                <select
                  id="edit-lesson-status"
                  className={lessonSelectClassName}
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
            </div>

            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                className="size-4 rounded border-line"
                disabled={isSubmitting}
                {...register("isRequired")}
              />
              Required lesson
            </label>

            {lesson.video_id ? (
              <p className="text-sm text-ink-soft">
                <span className="font-semibold text-ink">Video ID:</span>{" "}
                <span className="font-mono text-xs">{lesson.video_id}</span>
              </p>
            ) : null}

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
