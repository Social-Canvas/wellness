"use server"

import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/features/auth/services/auth.service"
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
  const result = await updateProduct(id, input)

  if (result.success) {
    revalidateProductsPath()
  }

  return result
}

export async function archiveProductAction(
  id: string
): Promise<ActionResult<Product>> {
  const result = await archiveProduct(id)

  if (result.success) {
    revalidateProductsPath()
  }

  return result
}

export async function upsertProductFileAction(
  input: UpsertProductFileInput
): Promise<ActionResult<ProductFile>> {
  const result = await upsertProductFile(input)

  if (result.success) {
    revalidateProductsPath()
  }

  return result
}

export async function deleteProductFileAction(
  input: DeleteProductFileInput
): Promise<ActionResult<void>> {
  const result = await deleteProductFile(input)

  if (result.success) {
    revalidateProductsPath()
  }

  return result
}

export async function listProductFilesAction(
  productId: string
): Promise<ActionResult<ProductFile[]>> {
  return listProductFiles(productId)
}
