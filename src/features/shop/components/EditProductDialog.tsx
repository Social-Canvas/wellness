"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
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
import {
  deleteProductFileAction,
  listProductFilesAction,
  updateProductAction,
  upsertProductFileAction,
} from "@/features/shop/actions/products.actions"
import { updateProductSchema } from "@/features/shop/schemas"
import {
  PRODUCT_STATUS_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  productSelectClassName,
  productTextareaClassName,
} from "@/features/shop/components/product-form-styles"
import type { Product, ProductFile } from "@/features/shop/types"
import { formatProductPrice } from "@/features/shop/utils/format-product"

const editProductFormSchema = updateProductSchema.extend({
  priceDollars: z
    .string()
    .trim()
    .min(1, "Price is required")
    .refine((value) => !Number.isNaN(Number(value)) && Number(value) > 0, {
      message: "Enter a valid price",
    }),
})

const productFileFormSchema = z.object({
  fileName: z.string().trim().min(1, "File name is required"),
  storageBucket: z.string().trim().min(1, "Storage bucket is required"),
  storagePath: z.string().trim().min(1, "Storage path is required"),
  mimeType: z.string().trim().optional(),
  sizeBytes: z.string().trim().optional(),
})

type EditProductFormValues = z.infer<typeof editProductFormSchema>
type ProductFileFormValues = z.infer<typeof productFileFormSchema>

interface EditProductDialogProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditProductDialog({
  product,
  open,
  onOpenChange,
}: EditProductDialogProps) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [files, setFiles] = useState<ProductFile[]>([])

  const form = useForm<EditProductFormValues>({
    resolver: zodResolver(editProductFormSchema),
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

  const fileForm = useForm<ProductFileFormValues>({
    resolver: zodResolver(productFileFormSchema),
    defaultValues: {
      fileName: "",
      storageBucket: "product-files",
      storagePath: "",
      mimeType: "",
      sizeBytes: "",
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form

  const {
    register: registerFile,
    handleSubmit: handleFileSubmit,
    reset: resetFileForm,
    formState: { errors: fileErrors, isSubmitting: isFileSubmitting },
  } = fileForm

  useEffect(() => {
    if (!product || !open) {
      return
    }

    reset({
      title: product.title,
      slug: product.slug,
      description: product.description ?? "",
      productType: product.product_type,
      priceDollars: (product.price_amount / 100).toFixed(2),
      currency: product.currency,
      stripePriceId: product.stripe_price_id ?? "",
      coverImageUrl: product.cover_image_url ?? "",
      status: product.status,
    })

    void listProductFilesAction(product.id).then((result) => {
      if (result.success) {
        setFiles(result.data)
      }
    })
  }, [open, product, reset])

  async function onSubmit(values: EditProductFormValues) {
    if (!product) {
      return
    }

    setFormError(null)

    const result = await updateProductAction(product.id, {
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

    onOpenChange(false)
    router.refresh()
  }

  async function onAddFile(values: ProductFileFormValues) {
    if (!product) {
      return
    }

    setFileError(null)

    const result = await upsertProductFileAction({
      productId: product.id,
      fileName: values.fileName,
      storageBucket: values.storageBucket,
      storagePath: values.storagePath,
      mimeType: values.mimeType || null,
      sizeBytes: values.sizeBytes ? Number(values.sizeBytes) : null,
    })

    if (!result.success) {
      setFileError(result.error.message)
      return
    }

    setFiles((current) => [...current, result.data])
    resetFileForm({
      fileName: "",
      storageBucket: values.storageBucket,
      storagePath: "",
      mimeType: "",
      sizeBytes: "",
    })
    router.refresh()
  }

  async function handleDeleteFile(fileId: string) {
    const result = await deleteProductFileAction({ fileId })

    if (!result.success) {
      setFileError(result.error.message)
      return
    }

    setFiles((current) => current.filter((file) => file.id !== fileId))
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogTitle>Edit product</DialogTitle>
          <DialogDescription>
            Update product details and attach download file metadata manually.
          </DialogDescription>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="edit-product-title">Title</Label>
              <Input id="edit-product-title" {...register("title")} />
              {errors.title ? (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-product-slug">Slug</Label>
              <Input id="edit-product-slug" {...register("slug")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-product-description">Description</Label>
              <textarea
                id="edit-product-description"
                className={productTextareaClassName}
                {...register("description")}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-product-type">Type</Label>
                <select
                  id="edit-product-type"
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
                <Label htmlFor="edit-product-status">Status</Label>
                <select
                  id="edit-product-status"
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
                <Label htmlFor="edit-product-price">Price (USD)</Label>
                <Input
                  id="edit-product-price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  {...register("priceDollars")}
                />
                {product ? (
                  <p className="text-xs text-ink-soft">
                    Current: {formatProductPrice(product.price_amount, product.currency)}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-product-stripe-price">Stripe price ID</Label>
                <Input id="edit-product-stripe-price" {...register("stripePriceId")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-product-cover">Cover image URL</Label>
              <Input id="edit-product-cover" {...register("coverImageUrl")} />
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save product"}
              </Button>
            </div>
          </form>

          <div className="mt-8 border-t border-line pt-6">
            <h3 className="font-display text-lg font-medium text-ink">Download files</h3>
            <p className="mt-1 text-sm text-ink-soft">
              Add Supabase storage metadata only. Upload files to the bucket separately.
            </p>

            {files.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {files.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between gap-3 rounded-[var(--radius-input)] border border-line px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{file.file_name}</p>
                      <p className="truncate text-xs text-ink-soft">
                        {file.storage_bucket}/{file.storage_path}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => void handleDeleteFile(file.id)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-ink-soft">No files configured yet.</p>
            )}

            <form className="mt-4 space-y-3" onSubmit={handleFileSubmit(onAddFile)}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="file-name">File name</Label>
                  <Input id="file-name" {...registerFile("fileName")} />
                  {fileErrors.fileName ? (
                    <p className="text-sm text-destructive">{fileErrors.fileName.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file-bucket">Storage bucket</Label>
                  <Input id="file-bucket" {...registerFile("storageBucket")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="file-path">Storage path</Label>
                <Input id="file-path" {...registerFile("storagePath")} />
                {fileErrors.storagePath ? (
                  <p className="text-sm text-destructive">{fileErrors.storagePath.message}</p>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="file-mime">MIME type</Label>
                  <Input id="file-mime" {...registerFile("mimeType")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file-size">Size (bytes)</Label>
                  <Input id="file-size" {...registerFile("sizeBytes")} />
                </div>
              </div>
              {fileError ? <p className="text-sm text-destructive">{fileError}</p> : null}
              <Button type="submit" variant="outline" disabled={isFileSubmitting}>
                {isFileSubmitting ? "Adding..." : "Add file metadata"}
              </Button>
            </form>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
