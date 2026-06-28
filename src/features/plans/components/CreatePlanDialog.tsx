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
import { createPlanAction } from "@/features/plans/actions/plans.actions"
import { createPlanSchema, type CreatePlanInput } from "@/features/plans/schemas"
import { cn } from "@/lib/utils"

const textareaClassName = cn(
  "min-h-24 w-full min-w-0 rounded-[var(--radius-input)] border border-line bg-surface px-3.5 py-3 font-body text-[15px] text-ink transition-colors outline-none placeholder:text-ink-soft/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-cream2 disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
)

interface CreatePlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePlanDialog({ open, onOpenChange }: CreatePlanDialogProps) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<CreatePlanInput>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      sortOrder: 0,
      isActive: true,
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form

  async function onSubmit(values: CreatePlanInput) {
    setFormError(null)

    const result = await createPlanAction({
      ...values,
      description: values.description || null,
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
        <DialogPopup>
          <DialogTitle>Create plan</DialogTitle>
          <DialogDescription>
            Add a membership plan. Prices are managed separately.
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
              <Label htmlFor="create-plan-name">Name</Label>
              <Input
                id="create-plan-name"
                aria-invalid={Boolean(errors.name)}
                disabled={isSubmitting}
                {...register("name")}
              />
              {errors.name ? (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-plan-slug">Slug</Label>
              <Input
                id="create-plan-slug"
                aria-invalid={Boolean(errors.slug)}
                disabled={isSubmitting}
                {...register("slug")}
              />
              {errors.slug ? (
                <p className="text-sm text-destructive">{errors.slug.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-plan-description">Description</Label>
              <textarea
                id="create-plan-description"
                className={textareaClassName}
                aria-invalid={Boolean(errors.description)}
                disabled={isSubmitting}
                {...register("description")}
              />
              {errors.description ? (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-plan-sort-order">Sort order</Label>
              <Input
                id="create-plan-sort-order"
                type="number"
                min={0}
                aria-invalid={Boolean(errors.sortOrder)}
                disabled={isSubmitting}
                {...register("sortOrder", { valueAsNumber: true })}
              />
              {errors.sortOrder ? (
                <p className="text-sm text-destructive">
                  {errors.sortOrder.message}
                </p>
              ) : null}
            </div>

            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                className="size-4 rounded border-line"
                disabled={isSubmitting}
                {...register("isActive")}
              />
              Active plan
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
                {isSubmitting ? "Creating…" : "Create plan"}
              </Button>
            </div>
          </form>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
