"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

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
import { createProductAction } from "@/features/shop/actions/products.actions"
import { createProductSchema } from "@/features/shop/schemas"
import {
  PRODUCT_STATUS_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  productSelectClassName,
  productTextareaClassName,
} from "@/features/shop/components/product-form-styles"

const createProductFormSchema = createProductSchema.extend({
  priceDollars: z
    .string()
    .trim()
    .min(1, "Price is required")
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, {
      message: "Enter a valid price",
    }),
})

type CreateProductFormValues = z.infer<typeof createProductFormSchema>

interface CreateProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateProductDialog({ open, onOpenChange }: CreateProductDialogProps) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<CreateProductFormValues>({
    resolver: zodResolver(createProductFormSchema),
    defaultValues: {
      title: "",
      slug: "",
      description: "",
      productType: "digital_download",
      priceDollars: "",
      currency: "usd",
      stripePriceId: "",
      coverImageUrl: "",
      status: "draft",
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form

  async function onSubmit(values: CreateProductFormValues) {
    setFormError(null)

    const result = await createProductAction({
      title: values.title,
      slug: values.slug,
      description: values.description || null,
      productType: values.productType,
      priceAmount: Math.round(Number(values.priceDollars) * 100),
      currency: values.currency,
      stripePriceId: values.stripePriceId || null,
      coverImageUrl: values.coverImageUrl || null,
      status: values.status,
    })

    if (!result.success) {
      setFormError(result.error.message)
      return
    }

    reset()
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-w-xl">
          <DialogTitle>Create product</DialogTitle>
          <DialogDescription>
            Add a digital product. Stripe price ID is required before checkout goes live.
          </DialogDescription>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="create-product-title">Title</Label>
              <Input id="create-product-title" {...register("title")} />
              {errors.title ? (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-product-slug">Slug</Label>
              <Input id="create-product-slug" {...register("slug")} />
              {errors.slug ? (
                <p className="text-sm text-destructive">{errors.slug.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-product-description">Description</Label>
              <textarea
                id="create-product-description"
                className={productTextareaClassName}
                {...register("description")}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-product-type">Type</Label>
                <select
                  id="create-product-type"
                  className={productSelectClassName}
                  {...register("productType")}
                >
                  {PRODUCT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-product-status">Status</Label>
                <select
                  id="create-product-status"
                  className={productSelectClassName}
                  {...register("status")}
                >
                  {PRODUCT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-product-price">Price (USD)</Label>
                <Input
                  id="create-product-price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  {...register("priceDollars")}
                />
                {errors.priceDollars ? (
                  <p className="text-sm text-destructive">{errors.priceDollars.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-product-stripe-price">Stripe price ID</Label>
                <Input id="create-product-stripe-price" {...register("stripePriceId")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-product-cover">Cover image URL</Label>
              <Input id="create-product-cover" {...register("coverImageUrl")} />
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create product"}
              </Button>
            </div>
          </form>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
