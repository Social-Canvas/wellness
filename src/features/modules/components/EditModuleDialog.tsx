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
import { updateModuleAction } from "@/features/modules/actions/modules.actions"
import { updateModuleSchema, type UpdateModuleInput } from "@/features/modules/schemas"
import type { Module } from "@/features/modules/types"

import {
  moduleSelectClassName,
  moduleTextareaClassName,
  PUBLISH_STATUS_OPTIONS,
} from "./module-form-styles"

interface EditModuleDialogProps {
  courseId: string
  module: Module | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditModuleDialog({
  courseId,
  module,
  open,
  onOpenChange,
}: EditModuleDialogProps) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<UpdateModuleInput>({
    resolver: zodResolver(updateModuleSchema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      sortOrder: 0,
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
    if (!module) {
      return
    }

    reset({
      title: module.title,
      slug: module.slug,
      description: module.description ?? "",
      sortOrder: module.sort_order,
      status: module.status,
    })
  }, [module, reset])

  async function onSubmit(values: UpdateModuleInput) {
    if (!module) {
      return
    }

    setFormError(null)

    const result = await updateModuleAction(courseId, module.id, {
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

  if (!module) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-lg">
          <DialogTitle>Edit module</DialogTitle>
          <DialogDescription>Update module details for {module.title}.</DialogDescription>

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
              <Label htmlFor="edit-module-title">Title</Label>
              <Input
                id="edit-module-title"
                aria-invalid={Boolean(errors.title)}
                disabled={isSubmitting}
                {...register("title")}
              />
              {errors.title ? (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-module-slug">Slug</Label>
              <Input
                id="edit-module-slug"
                aria-invalid={Boolean(errors.slug)}
                disabled={isSubmitting}
                {...register("slug")}
              />
              {errors.slug ? (
                <p className="text-sm text-destructive">{errors.slug.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-module-description">Description</Label>
              <textarea
                id="edit-module-description"
                className={moduleTextareaClassName}
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
                <Label htmlFor="edit-module-sort-order">Sort order</Label>
                <Input
                  id="edit-module-sort-order"
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
                <Label htmlFor="edit-module-status">Status</Label>
                <select
                  id="edit-module-status"
                  className={moduleSelectClassName}
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
