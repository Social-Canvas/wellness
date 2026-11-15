"use server"

import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/features/auth/services/auth.service"
import { uploadProductPdf } from "@/features/media/services/media.service"
import { requireStaffActor } from "@/server/auth/require-staff"
import type {
  CreateProductInput,
  DeleteProductFileInput,
  UpdateProductInput,
  UpsertProductFileInput,
} from "@/features/shop/schemas"
import {
  archiveProduct,
  createProduct,
  deleteProductFile,
  listProductFiles,
  updateProduct,
  upsertProductFile,
} from "@/features/shop/services/products.service"
import type { Product, ProductFile } from "@/features/shop/types"

function revalidateProductsPath() {
  revalidatePath("/admin/products")
  revalidatePath("/shop")
}

export async function createProductAction(
  input: CreateProductInput
): Promise<ActionResult<Product>> {
  const actor = await requireStaffActor()
  if (!actor.success) {
    return actor
  }
  const result = await createProduct(input)

  if (result.success) {
    revalidateProductsPath()
  }

  return result
}

export async function updateProductAction(
  id: string,
  input: UpdateProductInput
): Promise<ActionResult<Product>> {
  const actor = await requireStaffActor()
  if (!actor.success) {
    return actor
  }
  const result = await updateProduct(id, input)

  if (result.success) {
    revalidateProductsPath()
  }

  return result
}

export async function archiveProductAction(
  id: string
): Promise<ActionResult<Product>> {
  const actor = await requireStaffActor()
  if (!actor.success) {
    return actor
  }
  const result = await archiveProduct(id)

  if (result.success) {
    revalidateProductsPath()
  }

  return result
}

export async function upsertProductFileAction(
  input: UpsertProductFileInput
): Promise<ActionResult<ProductFile>> {
  const actor = await requireStaffActor()
  if (!actor.success) {
    return actor
  }
  const result = await upsertProductFile(input)

  if (result.success) {
    revalidateProductsPath()
  }

  return result
}

export async function deleteProductFileAction(
  input: DeleteProductFileInput
): Promise<ActionResult<void>> {
  const actor = await requireStaffActor()
  if (!actor.success) {
    return actor
  }
  const result = await deleteProductFile(input)

  if (result.success) {
    revalidateProductsPath()
  }

  return result
}

export async function listProductFilesAction(
  productId: string
): Promise<ActionResult<ProductFile[]>> {
  const actor = await requireStaffActor()
  if (!actor.success) {
    return actor
  }
  return listProductFiles(productId)
}

export async function uploadProductFileAction(
  formData: FormData
): Promise<ActionResult<ProductFile>> {
  const actor = await requireStaffActor()
  if (!actor.success) {
    return actor
  }

  const productId = String(formData.get("productId") ?? "")
  const file = formData.get("file")
  if (!(file instanceof File)) {
    return {
      success: false,
      error: { code: "validation_error", message: "Choose a PDF to upload." },
    }
  }

  const uploaded = await uploadProductPdf({ productId, file })
  if (!uploaded.success) {
    return uploaded
  }

  return upsertProductFileAction({
    productId,
    fileName: uploaded.data.fileName,
    storageBucket: "product-files",
    storagePath: uploaded.data.storagePath,
    mimeType: uploaded.data.mimeType,
    sizeBytes: uploaded.data.sizeBytes,
  })
}
