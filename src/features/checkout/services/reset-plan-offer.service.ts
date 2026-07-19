import "server-only"

import { cache } from "react"
import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { buildCheckoutConsentUrl } from "@/features/checkout/utils/checkout-urls"
import {
  buildResetPlanOfferView,
  resolveResetPlanAccessSource,
  resolveResetPlanProgressKind,
  shouldRefuseCheckoutForExistingResetAccess,
  type ResetPlanOfferView,
  type ResetPlanProgressKind,
} from "@/features/checkout/utils/reset-plan-offer-state"
import {
  RESET_COURSE_ID,
  RESET_LIBRARY_PATH,
  RESET_PRODUCT_SLUG,
} from "@/features/checkout/constants/destinations"
import { RESET_PLAN } from "@/lib/constants/elevate-brand"
import { createAdminClient } from "@/lib/supabase/admin"
import { canAccessCourse } from "@/server/services/entitlement.service"
import {
  COMP_PREVIEW_MARKER_PREFIX,
  hasActiveCompPreviewSubscription,
  isActiveSubscription,
} from "@/server/services/preview-eligibility"

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

const userIdSchema = z.uuid("Invalid user id.")

async function loadResetProductId(): Promise<ActionResult<string | null>> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .eq("slug", RESET_PRODUCT_SLUG)
      .maybeSingle()

    if (error) {
      return failure("provider_error", "Unable to resolve Reset Plan product.")
    }

    return success(data?.id ?? null)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

async function hasPaidOrPendingResetOrder(
  userId: string,
  productId: string
): Promise<ActionResult<{ hasPaid: boolean; hasPending: boolean }>> {
  try {
    const supabase = createAdminClient()
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, status")
      .eq("user_id", userId)
      .in("status", ["paid", "pending"])

    if (ordersError) {
      return failure("provider_error", "Unable to evaluate Reset Plan orders.")
    }

    if (!orders?.length) {
      return success({ hasPaid: false, hasPending: false })
    }

    const orderIds = orders.map((order) => order.id)
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("order_id, product_id")
      .in("order_id", orderIds)
      .eq("product_id", productId)

    if (itemsError) {
      return failure("provider_error", "Unable to evaluate Reset Plan orders.")
    }

    const matchingOrderIds = new Set((items ?? []).map((item) => item.order_id))
    const matchingOrders = orders.filter((order) => matchingOrderIds.has(order.id))

    return success({
      hasPaid: matchingOrders.some((order) => order.status === "paid"),
      hasPending: matchingOrders.some((order) => order.status === "pending"),
    })
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

async function hasSubscriptionCourseAccess(
  userId: string,
  courseId: string
): Promise<ActionResult<boolean>> {
  try {
    const supabase = createAdminClient()
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("plan_id, status, current_period_end, cancel_at_period_end")
      .eq("user_id", userId)

    if (subscriptionError) {
      return failure("provider_error", "Unable to evaluate subscription access.")
    }

    const planIds = [
      ...new Set(
        (subscriptions ?? [])
          .filter((subscription) => isActiveSubscription(subscription))
          .map((subscription) => subscription.plan_id)
      ),
    ]

    if (planIds.length === 0) {
      return success(false)
    }

    const { count, error: accessError } = await supabase
      .from("content_access")
      .select("id", { count: "exact", head: true })
      .in("plan_id", planIds)
      .eq("content_type", "course")
      .eq("content_id", courseId)

    if (accessError) {
      return failure("provider_error", "Unable to evaluate subscription access.")
    }

    return success((count ?? 0) > 0)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

async function hasActiveComplimentaryMarker(
  userId: string
): Promise<ActionResult<boolean>> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("subscriptions")
      .select("status, current_period_end, cancel_at_period_end, stripe_subscription_id")
      .eq("user_id", userId)
      .like("stripe_subscription_id", `${COMP_PREVIEW_MARKER_PREFIX}%`)

    if (error) {
      return failure("provider_error", "Unable to evaluate complimentary access.")
    }

    return success(hasActiveCompPreviewSubscription(data ?? []))
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

async function loadResetProgressKind(
  userId: string
): Promise<ActionResult<ResetPlanProgressKind>> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("course_progress")
      .select("completed_lessons, progress_percentage")
      .eq("user_id", userId)
      .eq("course_id", RESET_COURSE_ID)
      .maybeSingle()

    if (error) {
      return failure("provider_error", "Unable to load Reset Plan progress.")
    }

    if (!data) {
      return success("none")
    }

    return success(
      resolveResetPlanProgressKind({
        completedLessons: data.completed_lessons,
        progressPercentage: data.progress_percentage,
      })
    )
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

const checkoutHrefForReset = () =>
  buildCheckoutConsentUrl({
    type: "product",
    productSlug: RESET_PRODUCT_SLUG,
  })

/**
 * Request-scoped Reset Plan offer resolution. Uses React cache() so navbar,
 * homepage, and programs page share one entitlement evaluation per request.
 * Never shared across users.
 */
export const resolveResetPlanOfferForUser = cache(
  async (userId: string | null): Promise<ActionResult<ResetPlanOfferView>> => {
    const checkoutHref = checkoutHrefForReset()

    if (!userId) {
      return success(
        buildResetPlanOfferView({
          isAuthenticated: false,
          hasCourseAccess: false,
          accessSource: "none",
          isFulfillmentPending: false,
          progress: "none",
          checkoutHref,
          courseHref: RESET_LIBRARY_PATH,
          purchasePriceLabel: RESET_PLAN.priceLabel,
        })
      )
    }

    const parsedUserId = userIdSchema.safeParse(userId)

    if (!parsedUserId.success) {
      return failure("validation_error", "Invalid user id.")
    }

    const productIdResult = await loadResetProductId()

    if (!productIdResult.success) {
      return productIdResult
    }

    const [
      accessResult,
      subscriptionAccessResult,
      complimentaryResult,
      progressResult,
      orderResult,
    ] = await Promise.all([
      canAccessCourse(parsedUserId.data, RESET_COURSE_ID),
      hasSubscriptionCourseAccess(parsedUserId.data, RESET_COURSE_ID),
      hasActiveComplimentaryMarker(parsedUserId.data),
      loadResetProgressKind(parsedUserId.data),
      productIdResult.data
        ? hasPaidOrPendingResetOrder(parsedUserId.data, productIdResult.data)
        : Promise.resolve(success({ hasPaid: false, hasPending: false })),
    ])

    if (!accessResult.success) {
      return accessResult
    }

    if (!subscriptionAccessResult.success) {
      return subscriptionAccessResult
    }

    if (!complimentaryResult.success) {
      return complimentaryResult
    }

    if (!progressResult.success) {
      return progressResult
    }

    if (!orderResult.success) {
      return orderResult
    }

    const hasCourseAccess = accessResult.data
    const viaPurchase = orderResult.data.hasPaid
    const viaSubscription = subscriptionAccessResult.data
    const viaComplimentary = complimentaryResult.data
    const isFulfillmentPending =
      !hasCourseAccess && (orderResult.data.hasPending || viaPurchase)

    const accessSource = resolveResetPlanAccessSource({
      hasCourseAccess,
      viaPurchase,
      viaComplimentary,
      viaSubscription,
    })

    return success(
      buildResetPlanOfferView({
        isAuthenticated: true,
        hasCourseAccess,
        accessSource,
        isFulfillmentPending,
        progress: progressResult.data,
        checkoutHref,
        courseHref: RESET_LIBRARY_PATH,
        purchasePriceLabel: RESET_PLAN.priceLabel,
      })
    )
  }
)

/**
 * Resolve the Reset Plan card for the current request's authenticated profile
 * (or the public purchase state when logged out).
 */
export async function resolveCurrentResetPlanOffer(): Promise<
  ActionResult<ResetPlanOfferView>
> {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    return resolveResetPlanOfferForUser(null)
  }

  return resolveResetPlanOfferForUser(profileResult.data.id)
}

/**
 * Trusted library destination when an authenticated user already has access to
 * a course-granting product. Returns null when checkout may proceed.
 */
export async function resolveExistingCourseGrantDestination(input: {
  userId: string
  productId: string
}): Promise<ActionResult<string | null>> {
  const parsedUserId = userIdSchema.safeParse(input.userId)
  const parsedProductId = z.uuid("Invalid product id.").safeParse(input.productId)

  if (!parsedUserId.success || !parsedProductId.success) {
    return failure("validation_error", "Invalid checkout product.")
  }

  try {
    const supabase = createAdminClient()
    const { data: product, error } = await supabase
      .from("products")
      .select("slug, granted_course_id")
      .eq("id", parsedProductId.data)
      .maybeSingle()

    if (error) {
      return failure("provider_error", "Unable to resolve product access.")
    }

    if (!product?.granted_course_id) {
      return success(null)
    }

    const accessResult = await canAccessCourse(
      parsedUserId.data,
      product.granted_course_id
    )

    if (!accessResult.success) {
      return accessResult
    }

    if (
      !shouldRefuseCheckoutForExistingResetAccess({
        productSlug: product.slug,
        grantedCourseId: product.granted_course_id,
        hasCourseAccess: accessResult.data,
      })
    ) {
      return success(null)
    }

    if (
      product.granted_course_id === RESET_COURSE_ID ||
      product.slug === RESET_PRODUCT_SLUG
    ) {
      return success(RESET_LIBRARY_PATH)
    }

    return success(`/dashboard/library/${product.granted_course_id}`)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}
