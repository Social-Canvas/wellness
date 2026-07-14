import "server-only"

import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import type { UserRole } from "@/features/auth/types"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  COMP_PREVIEW_MARKER_PREFIX,
  evaluatePreviewEligibility,
  isActiveSubscription,
} from "@/server/services/preview-eligibility"
import type { Database } from "@/types/database/supabase"

type ContentType = Database["public"]["Enums"]["content_type"]

const userIdSchema = z.uuid("Invalid user id.")
const courseIdSchema = z.uuid("Invalid course id.")
const lessonIdSchema = z.uuid("Invalid lesson id.")
const videoIdSchema = z.uuid("Invalid video id.")
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

function mapDatabaseError(error: { code?: string; message: string }): ActionResult<never> {
  if (error.code === "PGRST116") {
    return failure("not_found", "Resource not found.")
  }

  return failure("provider_error", "Unable to evaluate entitlement. Please try again.")
}

async function getActivePlanIdsForUser(userId: string): Promise<ActionResult<string[]>> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("subscriptions")
      .select("plan_id, status, current_period_end, cancel_at_period_end")
      .eq("user_id", userId)

    if (error) {
      return mapDatabaseError(error)
    }

    const planIds = (data ?? [])
      .filter((subscription) => isActiveSubscription(subscription))
      .map((subscription) => subscription.plan_id)

    return success([...new Set(planIds)])
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

async function hasContentAccessForPlans(
  planIds: string[],
  contentType: ContentType,
  contentId: string
): Promise<ActionResult<boolean>> {
  if (planIds.length === 0) {
    return success(false)
  }

  try {
    const supabase = createAdminClient()
    const { count, error } = await supabase
      .from("content_access")
      .select("id", { count: "exact", head: true })
      .in("plan_id", planIds)
      .eq("content_type", contentType)
      .eq("content_id", contentId)

    if (error) {
      return mapDatabaseError(error)
    }

    return success((count ?? 0) > 0)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

async function hasSubscriptionContentAccess(
  userId: string,
  checks: Array<{ contentType: ContentType; contentId: string }>
): Promise<ActionResult<boolean>> {
  const planIdsResult = await getActivePlanIdsForUser(userId)

  if (!planIdsResult.success) {
    return planIdsResult
  }

  if (planIdsResult.data.length === 0 || checks.length === 0) {
    return success(false)
  }

  for (const check of checks) {
    const accessResult = await hasContentAccessForPlans(
      planIdsResult.data,
      check.contentType,
      check.contentId
    )

    if (!accessResult.success) {
      return accessResult
    }

    if (accessResult.data) {
      return success(true)
    }
  }

  return success(false)
}

async function getLessonContentChain(
  lessonId: string
): Promise<
  ActionResult<{
    lessonId: string
    moduleId: string
    courseId: string
  }>
> {
  try {
    const supabase = createAdminClient()
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("id, module_id")
      .eq("id", lessonId)
      .maybeSingle()

    if (lessonError) {
      return mapDatabaseError(lessonError)
    }

    if (!lesson) {
      return failure("not_found", "Lesson not found.")
    }

    const { data: lessonModule, error: moduleError } = await supabase
      .from("modules")
      .select("id, course_id")
      .eq("id", lesson.module_id)
      .maybeSingle()

    if (moduleError) {
      return mapDatabaseError(moduleError)
    }

    if (!lessonModule) {
      return failure("not_found", "Module not found.")
    }

    return success({
      lessonId: lesson.id,
      moduleId: lessonModule.id,
      courseId: lessonModule.course_id,
    })
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

async function hasPurchasedProduct(
  userId: string,
  productId: string
): Promise<ActionResult<boolean>> {
  try {
    const supabase = createAdminClient()
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "paid")

    if (ordersError) {
      return mapDatabaseError(ordersError)
    }

    if (!orders?.length) {
      return success(false)
    }

    const orderIds = orders.map((order) => order.id)
    const { count, error: itemsError } = await supabase
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .in("order_id", orderIds)
      .eq("product_id", productId)

    if (itemsError) {
      return mapDatabaseError(itemsError)
    }

    return success((count ?? 0) > 0)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

async function hasProductGrantedCourseAccess(
  userId: string,
  courseId: string
): Promise<ActionResult<boolean>> {
  try {
    const supabase = createAdminClient()
    const { data: products, error } = await supabase
      .from("products")
      .select("id")
      .eq("granted_course_id", courseId)

    if (error) {
      return mapDatabaseError(error)
    }

    if (!products?.length) {
      return success(false)
    }

    for (const product of products) {
      const purchasedResult = await hasPurchasedProduct(userId, product.id)

      if (!purchasedResult.success) {
        return purchasedResult
      }

      if (purchasedResult.data) {
        return success(true)
      }
    }

    return success(false)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

/**
 * Server-side check for draft-content preview eligibility.
 *
 * Returns true only when the caller is an admin/super_admin, or holds an active
 * complimentary launch-testing subscription (marker prefix
 * `comp_launch_testing_`). This is intentionally independent of the ordinary
 * entitlement path: it decides whether a user may *see* drafts of a course they
 * are already entitled to. Callers must still run the normal entitlement checks;
 * this never grants access on its own, and the `?preview=1` request flag never
 * grants access without this returning true.
 */
export async function canPreviewDraftContent(profile: {
  id: string
  role: UserRole
}): Promise<ActionResult<boolean>> {
  const parsedUserId = userIdSchema.safeParse(profile.id)

  if (!parsedUserId.success) {
    return validationFailure(firstValidationMessage(parsedUserId.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("subscriptions")
      .select("status, current_period_end, cancel_at_period_end, stripe_subscription_id")
      .eq("user_id", parsedUserId.data)
      .like("stripe_subscription_id", `${COMP_PREVIEW_MARKER_PREFIX}%`)

    if (error) {
      return mapDatabaseError(error)
    }

    return success(
      evaluatePreviewEligibility({
        role: profile.role,
        subscriptions: data ?? [],
      })
    )
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

/**
 * Defense-in-depth gate for signed playback: confirms a video is attached to at
 * least one fully published lesson (published module + published course). Draft
 * or unavailable lessons must never yield a Mux token even for authorized
 * previewers, so playback token issuance requires this in addition to
 * entitlement.
 */
export async function isVideoInPublishedLesson(
  videoId: string
): Promise<ActionResult<boolean>> {
  const parsedVideoId = videoIdSchema.safeParse(videoId)

  if (!parsedVideoId.success) {
    return validationFailure(firstValidationMessage(parsedVideoId.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("lessons")
      .select("id, status, modules!inner ( status, courses!inner ( status ) )")
      .eq("video_id", parsedVideoId.data)
      .eq("status", "published")

    if (error) {
      return mapDatabaseError(error)
    }

    const playable = (data ?? []).some((lesson) => {
      const lessonModule = Array.isArray(lesson.modules)
        ? lesson.modules[0]
        : lesson.modules
      const course = Array.isArray(lessonModule?.courses)
        ? lessonModule?.courses[0]
        : lessonModule?.courses

      return lessonModule?.status === "published" && course?.status === "published"
    })

    return success(playable)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function canAccessCourse(
  userId: string,
  courseId: string
): Promise<ActionResult<boolean>> {
  const parsedUserId = userIdSchema.safeParse(userId)
  const parsedCourseId = courseIdSchema.safeParse(courseId)

  if (!parsedUserId.success) {
    return validationFailure(firstValidationMessage(parsedUserId.error))
  }

  if (!parsedCourseId.success) {
    return validationFailure(firstValidationMessage(parsedCourseId.error))
  }

  const subscriptionAccessResult = await hasSubscriptionContentAccess(parsedUserId.data, [
    { contentType: "course", contentId: parsedCourseId.data },
  ])

  if (!subscriptionAccessResult.success) {
    return subscriptionAccessResult
  }

  if (subscriptionAccessResult.data) {
    return success(true)
  }

  return hasProductGrantedCourseAccess(parsedUserId.data, parsedCourseId.data)
}

export async function canAccessLesson(
  userId: string,
  lessonId: string
): Promise<ActionResult<boolean>> {
  const parsedUserId = userIdSchema.safeParse(userId)
  const parsedLessonId = lessonIdSchema.safeParse(lessonId)

  if (!parsedUserId.success) {
    return validationFailure(firstValidationMessage(parsedUserId.error))
  }

  if (!parsedLessonId.success) {
    return validationFailure(firstValidationMessage(parsedLessonId.error))
  }

  const chainResult = await getLessonContentChain(parsedLessonId.data)

  if (!chainResult.success) {
    return chainResult
  }

  const { lessonId: resolvedLessonId, moduleId, courseId } = chainResult.data

  const subscriptionAccessResult = await hasSubscriptionContentAccess(parsedUserId.data, [
    { contentType: "lesson", contentId: resolvedLessonId },
    { contentType: "module", contentId: moduleId },
    { contentType: "course", contentId: courseId },
  ])

  if (!subscriptionAccessResult.success) {
    return subscriptionAccessResult
  }

  if (subscriptionAccessResult.data) {
    return success(true)
  }

  return hasProductGrantedCourseAccess(parsedUserId.data, courseId)
}

export async function canAccessVideo(
  userId: string,
  videoId: string
): Promise<ActionResult<boolean>> {
  const parsedUserId = userIdSchema.safeParse(userId)
  const parsedVideoId = videoIdSchema.safeParse(videoId)

  if (!parsedUserId.success) {
    return validationFailure(firstValidationMessage(parsedUserId.error))
  }

  if (!parsedVideoId.success) {
    return validationFailure(firstValidationMessage(parsedVideoId.error))
  }

  const directAccessResult = await hasSubscriptionContentAccess(parsedUserId.data, [
    { contentType: "video", contentId: parsedVideoId.data },
  ])

  if (!directAccessResult.success || directAccessResult.data) {
    return directAccessResult
  }

  try {
    const supabase = createAdminClient()
    const { data: lessons, error } = await supabase
      .from("lessons")
      .select("id")
      .eq("video_id", parsedVideoId.data)

    if (error) {
      return mapDatabaseError(error)
    }

    for (const lesson of lessons ?? []) {
      const lessonAccessResult = await canAccessLesson(parsedUserId.data, lesson.id)

      if (!lessonAccessResult.success) {
        return lessonAccessResult
      }

      if (lessonAccessResult.data) {
        return success(true)
      }
    }

    return success(false)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function canDownloadProduct(
  userId: string,
  productId: string
): Promise<ActionResult<boolean>> {
  const parsedUserId = userIdSchema.safeParse(userId)
  const parsedProductId = productIdSchema.safeParse(productId)

  if (!parsedUserId.success) {
    return validationFailure(firstValidationMessage(parsedUserId.error))
  }

  if (!parsedProductId.success) {
    return validationFailure(firstValidationMessage(parsedProductId.error))
  }

  return hasPurchasedProduct(parsedUserId.data, parsedProductId.data)
}
