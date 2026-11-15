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
import { MediaUploader } from "@/features/media/components/media-uploader"
import {
  deleteProductFileAction,
  listProductFilesAction,
  updateProductAction,
  uploadProductFileAction,
} from "@/features/shop/actions/products.actions"
import { updateProductSchema } from "@/features/shop/schemas"
import {
  PRODUCT_STATUS_OPTIONS,
  productSelectClassName,
  productTextareaClassName,
} from "@/features/shop/components/product-form-styles"
import type { Product, ProductFile } from "@/features/shop/types"
import { formatProductPrice } from "@/features/shop/utils/format-product"

const editProductFormSchema = updateProductSchema

type EditProductFormValues = z.infer<typeof editProductFormSchema>

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
      description: "",
      coverImageUrl: "",
      status: "draft",
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = form
  const productId = product?.id ?? ""
  const storedCover = product?.cover_image_url ?? ""
  const [coverPreview, setCoverPreview] = useState({
    productId,
    open,
    url: storedCover,
  })
  if (coverPreview.productId !== productId || coverPreview.open !== open) {
    setCoverPreview({ productId, open, url: storedCover })
  }
  const coverImageUrl = coverPreview.url

  useEffect(() => {
    if (!product || !open) {
      return
    }

    reset({
      title: product.title,
      description: product.description ?? "",
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
      description: values.description || null,
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

  async function onAddFile(file: File | undefined) {
    if (!product || !file) {
      return
    }

    setFileError(null)
    const data = new FormData()
    data.set("productId", product.id)
    data.set("file", file)
    const result = await uploadProductFileAction(data)

    if (!result.success) {
      setFileError(result.error.message)
      return
    }

    setFiles((current) => [...current, result.data])
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
            Update public product copy and files. Slug, price, and Stripe stay locked.
          </DialogDescription>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="edit-product-title">Title</Label>
              <Input id="edit-product-title" {...register("title")} />
              {errors.title ? (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              ) : null}
            </div>

            {product ? (
              <div className="rounded-xl border border-line bg-cream2/40 px-4 py-3 text-sm text-ink-soft">
                <p>Slug: {product.slug}</p>
                <p>Price: {formatProductPrice(product.price_amount, product.currency)}</p>
                <p>Stripe price: {product.stripe_price_id ?? "Not set"}</p>
                <p className="mt-1 text-xs">
                  These identifiers stay fixed so existing purchases and links keep working.
                </p>
              </div>
            ) : null}

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

            <MediaUploader
              label="Cover image"
              value={coverImageUrl}
              alt={product?.title ?? "Product image"}
              showAlt={false}
              folder="products"
              disabled={isSubmitting}
              onChange={({ url }) => {
                setCoverPreview({ productId, open, url })
                setValue("coverImageUrl", url, { shouldDirty: true })
              }}
            />

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
              Upload a PDF. Buyers receive a short-lived download link after purchase.
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

            <div className="mt-4 space-y-2">
              <Label htmlFor="product-pdf">PDF file</Label>
              <input
                id="product-pdf"
                type="file"
                accept="application/pdf"
                className="block w-full text-sm text-ink"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  void onAddFile(file)
                  event.target.value = ""
                }}
              />
              {fileError ? <p className="text-sm text-destructive">{fileError}</p> : null}
            </div>
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  )
}
