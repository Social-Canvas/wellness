import "server-only"

import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/database/supabase"

type ContentType = Database["public"]["Enums"]["content_type"]
type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"]

type ActiveSubscriptionSnapshot = Pick<
  Subscription,
  "status" | "current_period_end" | "cancel_at_period_end"
>

const userIdSchema = z.uuid("Invalid user id.")
const courseIdSchema = z.uuid("Invalid course id.")
const lessonIdSchema = z.uuid("Invalid lesson id.")
const videoIdSchema = z.uuid("Invalid video id.")
const productIdSchema = z.uuid("Invalid product id.")

const ACTIVE_SUBSCRIPTION_STATUSES = new Set<Subscription["status"]>([
  "active",
  "trialing",
])

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

function isActiveSubscription(subscription: ActiveSubscriptionSnapshot): boolean {
  const now = Date.now()
  const periodEnd = subscription.current_period_end
    ? Date.parse(subscription.current_period_end)
    : null
  const hasValidPeriodEnd =
    periodEnd !== null && !Number.isNaN(periodEnd) && periodEnd > now

  if (periodEnd !== null && !Number.isNaN(periodEnd) && periodEnd <= now) {
    return false
  }

  if (ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    return true
  }

  if (subscription.cancel_at_period_end && hasValidPeriodEnd) {
    return true
  }

  return false
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

  return hasSubscriptionContentAccess(parsedUserId.data, [
    { contentType: "course", contentId: parsedCourseId.data },
  ])
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

  return hasSubscriptionContentAccess(parsedUserId.data, [
    { contentType: "lesson", contentId: resolvedLessonId },
    { contentType: "module", contentId: moduleId },
    { contentType: "course", contentId: courseId },
  ])
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
