import "server-only"

import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  createProductSchema,
  deleteProductFileSchema,
  updateProductSchema,
  upsertProductFileSchema,
  type CreateProductInput,
  type DeleteProductFileInput,
  type UpdateProductInput,
  type UpsertProductFileInput,
} from "@/features/shop/schemas"
import type { Product, ProductFile } from "@/features/shop/types"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/database/supabase"

const productIdSchema = z.uuid("Invalid product id.")

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

function validationFailure(message: string): ActionResult<never> {
  return failure("validation_error", message)
}

function firstValidationMessage(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Invalid input."
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value === undefined) {
    return null
  }

  const trimmed = value?.trim() ?? ""
  return trimmed === "" ? null : trimmed
}

function mapDatabaseError(error: { code?: string; message: string }): ActionResult<never> {
  if (error.code === "23505") {
    return failure("validation_error", "A product with this slug or Stripe price already exists.")
  }

  if (error.code === "PGRST116") {
    return failure("not_found", "Product not found.")
  }

  return failure("provider_error", "Unable to complete the product request. Please try again.")
}

function mapCreateProductInput(
  input: CreateProductInput
): Database["public"]["Tables"]["products"]["Insert"] {
  return {
    title: input.title,
    slug: input.slug,
    description: emptyToNull(input.description ?? null),
    product_type: input.productType,
    price_amount: input.priceAmount,
    currency: input.currency ?? "usd",
    stripe_price_id: emptyToNull(input.stripePriceId ?? null),
    cover_image_url: emptyToNull(input.coverImageUrl ?? null),
    status: input.status ?? "draft",
  }
}

function mapUpdateProductInput(
  input: UpdateProductInput
): Database["public"]["Tables"]["products"]["Update"] {
  const updates: Database["public"]["Tables"]["products"]["Update"] = {}

  if (input.title !== undefined) {
    updates.title = input.title
  }

  if (input.slug !== undefined) {
    updates.slug = input.slug
  }

  if (input.description !== undefined) {
    updates.description = emptyToNull(input.description)
  }

  if (input.productType !== undefined) {
    updates.product_type = input.productType
  }

  if (input.priceAmount !== undefined) {
    updates.price_amount = input.priceAmount
  }

  if (input.currency !== undefined) {
    updates.currency = input.currency
  }

  if (input.stripePriceId !== undefined) {
    updates.stripe_price_id = emptyToNull(input.stripePriceId)
  }

  if (input.coverImageUrl !== undefined) {
    updates.cover_image_url = emptyToNull(input.coverImageUrl)
  }

  if (input.status !== undefined) {
    updates.status = input.status
  }

  return updates
}

export async function listProducts(): Promise<ActionResult<Product[]>> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("title", { ascending: true })

    if (error) {
      return mapDatabaseError(error)
    }

    return success(data ?? [])
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function getProduct(id: string): Promise<ActionResult<Product>> {
  const parsedId = productIdSchema.safeParse(id)

  if (!parsedId.success) {
    return validationFailure(firstValidationMessage(parsedId.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", parsedId.data)
      .maybeSingle()

    if (error) {
      return mapDatabaseError(error)
    }

    if (!data) {
      return failure("not_found", "Product not found.")
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function createProduct(
  input: CreateProductInput
): Promise<ActionResult<Product>> {
  const parsed = createProductSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("products")
      .insert(mapCreateProductInput(parsed.data))
      .select("*")
      .single()

    if (error) {
      return mapDatabaseError(error)
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput
): Promise<ActionResult<Product>> {
  const parsedId = productIdSchema.safeParse(id)
  const parsed = updateProductSchema.safeParse(input)

  if (!parsedId.success) {
    return validationFailure(firstValidationMessage(parsedId.error))
  }

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  const updates = mapUpdateProductInput(parsed.data)

  if (Object.keys(updates).length === 0) {
    return failure("validation_error", "No changes were provided.")
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", parsedId.data)
      .select("*")
      .single()

    if (error) {
      return mapDatabaseError(error)
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function archiveProduct(id: string): Promise<ActionResult<Product>> {
  const parsedId = productIdSchema.safeParse(id)

  if (!parsedId.success) {
    return validationFailure(firstValidationMessage(parsedId.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("products")
      .update({ status: "archived" })
      .eq("id", parsedId.data)
      .select("*")
      .single()

    if (error) {
      return mapDatabaseError(error)
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function listProductFiles(
  productId: string
): Promise<ActionResult<ProductFile[]>> {
  const parsedId = productIdSchema.safeParse(productId)

  if (!parsedId.success) {
    return validationFailure(firstValidationMessage(parsedId.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("product_files")
      .select("*")
      .eq("product_id", parsedId.data)
      .order("created_at", { ascending: true })

    if (error) {
      return mapDatabaseError(error)
    }

    return success(data ?? [])
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function upsertProductFile(
  input: UpsertProductFileInput
): Promise<ActionResult<ProductFile>> {
  const parsed = upsertProductFileSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("product_files")
      .insert({
        product_id: parsed.data.productId,
        file_name: parsed.data.fileName,
        storage_bucket: parsed.data.storageBucket,
        storage_path: parsed.data.storagePath,
        mime_type: emptyToNull(parsed.data.mimeType ?? null),
        size_bytes: parsed.data.sizeBytes ?? null,
      })
      .select("*")
      .single()

    if (error) {
      return mapDatabaseError(error)
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function deleteProductFile(
  input: DeleteProductFileInput
): Promise<ActionResult<void>> {
  const parsed = deleteProductFileSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("product_files")
      .delete()
      .eq("id", parsed.data.fileId)

    if (error) {
      return mapDatabaseError(error)
    }

    return success(undefined)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}
