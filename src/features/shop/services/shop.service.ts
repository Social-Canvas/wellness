import "server-only"

import type Stripe from "stripe"
import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  buildCheckoutCancelUrl,
  buildCheckoutSuccessUrl,
} from "@/features/checkout/utils/stripe-return-urls"
import {
  RESET_COURSE_ID,
  RESET_LIBRARY_PATH,
} from "@/features/checkout/constants/destinations"
import { shouldRefuseCheckoutForExistingResetAccess } from "@/features/checkout/utils/reset-plan-offer-state"
import {
  createProductCheckoutSchema,
  generateProductDownloadUrlSchema,
  type CreateProductCheckoutInput,
  type GenerateProductDownloadUrlInput,
} from "@/features/shop/schemas"
import { env } from "@/lib/config"
import {
  assertCheckoutUsesTestModeKeys,
  isConfiguredStripePriceId,
} from "@/server/integrations/stripe/mode"
import {
  isProgramCatalogProductType,
  isPurchasableCatalogProductType,
  isShopCatalogProductType,
} from "@/features/shop/constants/catalog"
import type {
  ProductCheckoutResult,
  ProductDownloadUrlResult,
  ShopProduct,
  ShopProductDetail,
} from "@/features/shop/types"
import { RESET_PLAN } from "@/lib/constants/elevate-brand"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  sendPurchaseConfirmationEmail,
  sendResetCourseAccessGrantedEmail,
} from "@/server/integrations/resend/transactional-email.service"
import { getStripeClient } from "@/server/integrations/stripe/client"
import { logger, safeErrorMessage } from "@/server/utils/logger"
import {
  canAccessCourse,
  canDownloadProduct,
} from "@/server/services/entitlement.service"
import type { Database } from "@/types/database/supabase"

const userIdSchema = z.uuid("Invalid user id.")
const productIdSchema = z.uuid("Invalid product id.")
const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required.")
  .max(80, "Slug is too long.")
const checkoutSessionIdSchema = z.string().min(1, "Invalid checkout session id.")

const DOWNLOAD_URL_EXPIRES_SECONDS = 900

type ProductRow = Database["public"]["Tables"]["products"]["Row"]
type ProductFileRow = Database["public"]["Tables"]["product_files"]["Row"]

type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "email" | "full_name" | "stripe_customer_id"
>

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

function mapDatabaseError(error: { code?: string; message: string }): ActionResult<never> {
  if (error.code === "23505") {
    return failure("provider_error", "Order record conflict. Please try again.")
  }

  if (error.code === "PGRST116") {
    return failure("not_found", "Product not found.")
  }

  return failure("provider_error", "Unable to complete the shop request. Please try again.")
}

function mapShopProduct(product: ProductRow): ShopProduct {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    description: product.description,
    productType: product.product_type,
    priceAmount: product.price_amount,
    currency: product.currency,
    coverImageUrl: product.cover_image_url,
  }
}

async function getProfileByUserId(userId: string): Promise<ActionResult<ProfileRow>> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, stripe_customer_id")
      .eq("id", userId)
      .maybeSingle()

    if (error) {
      return mapDatabaseError(error)
    }

    if (!data) {
      return failure("not_found", "Profile not found.")
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

async function ensureStripeCustomer(
  profile: ProfileRow
): Promise<ActionResult<string>> {
  if (profile.stripe_customer_id) {
    return success(profile.stripe_customer_id)
  }

  try {
    const stripe = getStripeClient()
    const customer = await stripe.customers.create({
      email: profile.email,
      metadata: {
        profile_id: profile.id,
      },
    })

    const supabase = createAdminClient()
    const { error } = await supabase
      .from("profiles")
      .update({ stripe_customer_id: customer.id })
      .eq("id", profile.id)

    if (error) {
      return mapDatabaseError(error)
    }

    return success(customer.id)
  } catch {
    return failure("provider_error", "Unable to create Stripe customer. Please try again.")
  }
}

async function getPublishedProductBySlugInternal(
  slug: string
): Promise<ActionResult<ProductRow>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
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

async function getProductByStripePriceId(
  stripePriceId: string
): Promise<ActionResult<ProductRow>> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("stripe_price_id", stripePriceId)
      .maybeSingle()

    if (error) {
      return mapDatabaseError(error)
    }

    if (!data) {
      return failure("not_found", "Product not found for Stripe price.")
    }

    return success(data)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

async function getProduct(productId: string): Promise<ActionResult<ProductRow>> {
  const parsedId = productIdSchema.safeParse(productId)

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

export async function listPublishedProducts(): Promise<ActionResult<ShopProduct[]>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("status", "published")
      .order("title", { ascending: true })

    if (error) {
      return mapDatabaseError(error)
    }

    return success((data ?? []).map(mapShopProduct))
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function listShopCatalogProducts(): Promise<ActionResult<ShopProduct[]>> {
  const result = await listPublishedProducts()

  if (!result.success) {
    return result
  }

  return success(
    result.data.filter((product) => isShopCatalogProductType(product.productType))
  )
}

export async function listProgramCatalogProducts(): Promise<ActionResult<ShopProduct[]>> {
  const result = await listPublishedProducts()

  if (!result.success) {
    return result
  }

  return success(
    result.data.filter((product) => isProgramCatalogProductType(product.productType))
  )
}

export async function getPublishedProductDetail(
  slug: string,
  userId?: string | null
): Promise<ActionResult<ShopProductDetail>> {
  const parsedSlug = slugSchema.safeParse(slug)

  if (!parsedSlug.success) {
    return validationFailure(firstValidationMessage(parsedSlug.error))
  }

  const productResult = await getPublishedProductBySlugInternal(parsedSlug.data)

  if (!productResult.success) {
    return productResult
  }

  return getPublishedProductDetailFromRow(productResult.data, userId)
}

export async function getShopCatalogProductDetail(
  slug: string,
  userId?: string | null
): Promise<ActionResult<ShopProductDetail>> {
  const parsedSlug = slugSchema.safeParse(slug)

  if (!parsedSlug.success) {
    return validationFailure(firstValidationMessage(parsedSlug.error))
  }

  const productResult = await getPublishedProductBySlugInternal(parsedSlug.data)

  if (!productResult.success) {
    return productResult
  }

  if (!isShopCatalogProductType(productResult.data.product_type)) {
    return failure("not_found", "Product not found.")
  }

  return getPublishedProductDetailFromRow(productResult.data, userId)
}

async function getPublishedProductDetailFromRow(
  product: ProductRow,
  userId?: string | null
): Promise<ActionResult<ShopProductDetail>> {

  let isPurchased = false

  if (userId) {
    const parsedUserId = userIdSchema.safeParse(userId)

    if (parsedUserId.success) {
      const purchaseResult = await canDownloadProduct(parsedUserId.data, product.id)
      if (purchaseResult.success) {
        isPurchased = purchaseResult.data
      }
    }
  }

  try {
    const supabase = createAdminClient()
    const { data: files, error } = await supabase
      .from("product_files")
      .select("id, file_name, mime_type, size_bytes")
      .eq("product_id", product.id)
      .order("created_at", { ascending: true })

    if (error) {
      return mapDatabaseError(error)
    }

    return success({
      ...mapShopProduct(product),
      isPurchased,
      files: (files ?? []).map((file) => ({
        id: file.id,
        fileName: file.file_name,
        mimeType: file.mime_type,
        sizeBytes: file.size_bytes,
      })),
    })
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function createProductCheckoutSession(
  userId: string,
  input: CreateProductCheckoutInput
): Promise<ActionResult<ProductCheckoutResult>> {
  const parsedUserId = userIdSchema.safeParse(userId)
  const parsedInput = createProductCheckoutSchema.safeParse(input)

  if (!parsedUserId.success) {
    return validationFailure(firstValidationMessage(parsedUserId.error))
  }

  if (!parsedInput.success) {
    return validationFailure(firstValidationMessage(parsedInput.error))
  }

  try {
    const supabase = createAdminClient()
    const { data: product, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", parsedInput.data.productId)
      .eq("status", "published")
      .maybeSingle()

    if (error) {
      return mapDatabaseError(error)
    }

    if (!product) {
      return failure("not_found", "Product not found.")
    }

    if (!isPurchasableCatalogProductType(product.product_type)) {
      return failure("not_found", "Product not found.")
    }

    // Defense in depth: never send entitled Reset/course users to Stripe.
    if (product.granted_course_id) {
      const courseAccessResult = await canAccessCourse(
        parsedUserId.data,
        product.granted_course_id
      )

      if (!courseAccessResult.success) {
        return courseAccessResult
      }

      if (
        shouldRefuseCheckoutForExistingResetAccess({
          productSlug: product.slug,
          grantedCourseId: product.granted_course_id,
          hasCourseAccess: courseAccessResult.data,
        })
      ) {
        const destination =
          product.granted_course_id === RESET_COURSE_ID
            ? RESET_LIBRARY_PATH
            : `/dashboard/library/${product.granted_course_id}`

        return success({
          sessionId: null,
          url: destination,
          alreadyEntitled: true,
        })
      }
    }

    const purchaseResult = await canDownloadProduct(
      parsedUserId.data,
      parsedInput.data.productId
    )

    if (!purchaseResult.success) {
      return purchaseResult
    }

    if (purchaseResult.data) {
      // Course-granting products already handled above; other owned products
      // (e.g. ebooks) remain non-repurchasable without opening Stripe.
      return failure("already_purchased", "You already own this product.")
    }

    if (!product.stripe_price_id) {
      return failure(
        "provider_error",
        "This product is not configured for checkout yet."
      )
    }

    const modeCheck = assertCheckoutUsesTestModeKeys({
      secretKey: env.STRIPE_SECRET_KEY,
      publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    })

    if (!modeCheck.ok) {
      return failure("provider_error", modeCheck.message)
    }

    if (!isConfiguredStripePriceId(product.stripe_price_id)) {
      return failure(
        "provider_error",
        "This product is not configured with a Stripe test Price ID yet."
      )
    }

    const profileResult = await getProfileByUserId(parsedUserId.data)

    if (!profileResult.success) {
      return profileResult
    }

    const customerResult = await ensureStripeCustomer(profileResult.data)

    if (!customerResult.success) {
      return customerResult
    }

    const stripe = getStripeClient()
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerResult.data,
      client_reference_id: parsedUserId.data,
      line_items: [
        {
          price: product.stripe_price_id,
          quantity: 1,
        },
      ],
      success_url: buildCheckoutSuccessUrl(),
      cancel_url: buildCheckoutCancelUrl({ type: "product" }),
      metadata: {
        profile_id: parsedUserId.data,
        product_id: product.id,
        purchase_type: "product",
      },
    })

    if (!session.url) {
      return failure("provider_error", "Unable to create checkout session.")
    }

    return success({
      sessionId: session.id,
      url: session.url,
      alreadyEntitled: false,
    })
  } catch {
    return failure("provider_error", "Unable to create checkout session. Please try again.")
  }
}

function mapOrderStatus(session: Stripe.Checkout.Session): Database["public"]["Enums"]["order_status"] {
  if (session.payment_status === "paid") {
    return "paid"
  }

  if (session.status === "expired") {
    return "failed"
  }

  return "pending"
}

async function ensureOrderItems(
  orderId: string,
  product: ProductRow,
  quantity: number,
  unitAmount: number,
  currency: string
): Promise<ActionResult<void>> {
  try {
    const supabase = createAdminClient()
    const { count, error: countError } = await supabase
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .eq("order_id", orderId)

    if (countError) {
      return mapDatabaseError(countError)
    }

    if ((count ?? 0) > 0) {
      return success(undefined)
    }

    const { error } = await supabase.from("order_items").insert({
      order_id: orderId,
      product_id: product.id,
      quantity,
      unit_amount: unitAmount,
      currency,
    })

    if (error) {
      return mapDatabaseError(error)
    }

    return success(undefined)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function syncOrderFromStripeCheckoutSession(
  checkoutSessionId: string
): Promise<ActionResult<{ orderId: string }>> {
  const parsedSessionId = checkoutSessionIdSchema.safeParse(checkoutSessionId)

  if (!parsedSessionId.success) {
    return validationFailure(firstValidationMessage(parsedSessionId.error))
  }

  try {
    const stripe = getStripeClient()
    const session = await stripe.checkout.sessions.retrieve(parsedSessionId.data, {
      expand: ["line_items.data.price", "payment_intent"],
    })

    if (session.mode !== "payment") {
      return failure("validation_error", "Checkout session is not a one-time payment.")
    }

    const userId =
      session.metadata?.profile_id ??
      (session.client_reference_id ? session.client_reference_id : null)

    const parsedUserId = userIdSchema.safeParse(userId)

    if (!parsedUserId.success) {
      return failure("not_found", "Checkout session is missing a profile reference.")
    }

    const productId = session.metadata?.product_id ?? null
    let product: ProductRow | null = null

    if (productId) {
      const productResult = await getProduct(productId)

      if (productResult.success) {
        product = productResult.data
      }
    }

    const lineItem = session.line_items?.data[0]
    const stripePriceId =
      typeof lineItem?.price === "string" ? lineItem.price : lineItem?.price?.id

    if (!product && stripePriceId) {
      const productResult = await getProductByStripePriceId(stripePriceId)

      if (productResult.success) {
        product = productResult.data
      }
    }

    if (!product) {
      return failure("not_found", "Unable to resolve product for checkout session.")
    }

    const paymentIntent = session.payment_intent
    const paymentIntentId =
      typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id ?? null
    const status = mapOrderStatus(session)
    const amountPaid = session.amount_total ?? product.price_amount
    const currency = session.currency ?? product.currency

    const supabase = createAdminClient()

    const { data: existingOrder, error: existingError } = await supabase
      .from("orders")
      .select("id, status")
      .eq("stripe_checkout_session_id", session.id)
      .maybeSingle()

    if (existingError) {
      return mapDatabaseError(existingError)
    }

    if (existingOrder?.status === "paid") {
      return success({ orderId: existingOrder.id })
    }

    const shouldSendPurchaseEmails = status === "paid"

    const orderPayload = {
      user_id: parsedUserId.data,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      status,
      amount_paid: amountPaid,
      currency,
      purchased_at: status === "paid" ? new Date().toISOString() : null,
    }

    let orderId = existingOrder?.id

    if (orderId) {
      const { error } = await supabase.from("orders").update(orderPayload).eq("id", orderId)

      if (error) {
        return mapDatabaseError(error)
      }
    } else {
      const { data, error } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select("id")
        .single()

      if (error?.code === "23505") {
        const { data: duplicateOrder, error: duplicateError } = await supabase
          .from("orders")
          .select("id, status")
          .eq("stripe_checkout_session_id", session.id)
          .maybeSingle()

        if (duplicateError || !duplicateOrder) {
          return duplicateError
            ? mapDatabaseError(duplicateError)
            : failure("provider_error", "Unable to sync order.")
        }

        orderId = duplicateOrder.id
      } else if (error || !data) {
        return error
          ? mapDatabaseError(error)
          : failure("provider_error", "Unable to create order.")
      } else {
        orderId = data.id
      }
    }

    if (!orderId) {
      return failure("provider_error", "Unable to resolve order record.")
    }

    const unitAmount =
      typeof lineItem?.price === "object" && lineItem?.price?.unit_amount
        ? lineItem.price.unit_amount
        : product.price_amount

    const itemsResult = await ensureOrderItems(
      orderId,
      product,
      lineItem?.quantity ?? 1,
      unitAmount,
      currency
    )

    if (!itemsResult.success) {
      return itemsResult
    }

    if (shouldSendPurchaseEmails) {
      const profileResult = await getProfileByUserId(parsedUserId.data)

      if (!profileResult.success) {
        logger.warn("Unable to load profile for purchase emails.", {
          orderId,
          userId: parsedUserId.data,
          checkoutSessionId: session.id,
        })
      } else {
        try {
          await sendPurchaseConfirmationEmail({
            to: profileResult.data.email,
            fullName: profileResult.data.full_name,
            productTitle: product.title,
            orderId,
          })

          if (product.slug === RESET_PLAN.slug) {
            await sendResetCourseAccessGrantedEmail({
              to: profileResult.data.email,
              fullName: profileResult.data.full_name,
              orderId,
            })
          }
        } catch (error) {
          logger.error("Purchase email dispatch failed without blocking order sync.", {
            orderId,
            checkoutSessionId: session.id,
            error: safeErrorMessage(error),
          })
        }
      }
    }

    return success({ orderId })
  } catch {
    return failure("provider_error", "Unable to sync order from Stripe.")
  }
}

export async function generateProductDownloadUrl(
  userId: string,
  input: GenerateProductDownloadUrlInput
): Promise<ActionResult<ProductDownloadUrlResult>> {
  const parsedUserId = userIdSchema.safeParse(userId)
  const parsedInput = generateProductDownloadUrlSchema.safeParse(input)

  if (!parsedUserId.success) {
    return validationFailure(firstValidationMessage(parsedUserId.error))
  }

  if (!parsedInput.success) {
    return validationFailure(firstValidationMessage(parsedInput.error))
  }

  const accessResult = await canDownloadProduct(
    parsedUserId.data,
    parsedInput.data.productId
  )

  if (!accessResult.success) {
    return accessResult
  }

  if (!accessResult.data) {
    return failure("entitlement_required", "Purchase this product to download files.")
  }

  const productResult = await getProduct(parsedInput.data.productId)

  if (!productResult.success) {
    return productResult
  }

  if (!isShopCatalogProductType(productResult.data.product_type)) {
    return failure("not_found", "Product not found.")
  }

  try {
    const supabase = createAdminClient()

    let fileQuery = supabase
      .from("product_files")
      .select("*")
      .eq("product_id", parsedInput.data.productId)

    if (parsedInput.data.fileId) {
      fileQuery = fileQuery.eq("id", parsedInput.data.fileId)
    }

    const { data: file, error } = await fileQuery.order("created_at", { ascending: true }).limit(1).maybeSingle()

    if (error) {
      return mapDatabaseError(error)
    }

    if (!file) {
      return failure("not_found", "Download file not found for this product.")
    }

    const productFile = file as ProductFileRow
    const { data: signedUrl, error: signedUrlError } = await supabase.storage
      .from(productFile.storage_bucket)
      .createSignedUrl(productFile.storage_path, DOWNLOAD_URL_EXPIRES_SECONDS)

    if (signedUrlError || !signedUrl?.signedUrl) {
      return failure("provider_error", "Unable to generate download URL.")
    }

    return success({
      url: signedUrl.signedUrl,
      fileName: productFile.file_name,
      expiresInSeconds: DOWNLOAD_URL_EXPIRES_SECONDS,
    })
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}
