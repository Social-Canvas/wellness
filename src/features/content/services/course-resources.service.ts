import "server-only"

import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  COURSE_RESOURCE_DOWNLOAD_URL_EXPIRES_SECONDS,
  COURSE_RESOURCES_BUCKET,
  decideCourseResourceDownloadAccess,
} from "@/features/content/utils/course-resources"
import { createAdminClient } from "@/lib/supabase/admin"
import { canAccessCourse } from "@/server/services/entitlement.service"
import type { Database } from "@/types/database/supabase"

type CourseResourceRow = Database["public"]["Tables"]["course_resources"]["Row"]

export type CourseResourceListItem = {
  id: string
  slug: string
  title: string
  description: string | null
  fileName: string
  mimeType: string | null
  sizeBytes: number | null
  sortOrder: number
}

export type CourseResourceDownloadUrlResult = {
  url: string
  fileName: string
  expiresInSeconds: number
}

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

function validationFailure(message: string): ActionResult<never> {
  return failure("validation_error", message)
}

const uuidSchema = z.uuid("Invalid id.")

function toListItem(row: CourseResourceRow): CourseResourceListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    sortOrder: row.sort_order,
  }
}

/**
 * List published resources for a course the user is entitled to access.
 * Never returns storage paths or buckets to the client.
 */
export async function listCourseResourcesForMember(
  userId: string,
  courseId: string
): Promise<ActionResult<CourseResourceListItem[]>> {
  const parsedUserId = uuidSchema.safeParse(userId)
  const parsedCourseId = uuidSchema.safeParse(courseId)

  if (!parsedUserId.success) {
    return validationFailure(parsedUserId.error.issues[0]?.message ?? "Invalid user id.")
  }
  if (!parsedCourseId.success) {
    return validationFailure(
      parsedCourseId.error.issues[0]?.message ?? "Invalid course id."
    )
  }

  const access = await canAccessCourse(parsedUserId.data, parsedCourseId.data)
  if (!access.success) {
    return access
  }
  if (!access.data) {
    return failure("entitlement_required", "You do not have access to this course.")
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("course_resources")
      .select("*")
      .eq("course_id", parsedCourseId.data)
      .eq("status", "published")
      .order("sort_order", { ascending: true })

    if (error) {
      return failure("database_error", "Unable to load course resources.")
    }

    return success((data ?? []).map(toListItem))
  } catch {
    return failure("unknown_error", "Unable to load course resources.")
  }
}

/**
 * Issue a short-lived signed download URL after course entitlement check.
 * Client never supplies storage bucket/path.
 */
export async function generateCourseResourceDownloadUrl(
  userId: string,
  input: { courseId: string; resourceId: string }
): Promise<ActionResult<CourseResourceDownloadUrlResult>> {
  const parsedUserId = uuidSchema.safeParse(userId)
  const parsedCourseId = uuidSchema.safeParse(input.courseId)
  const parsedResourceId = uuidSchema.safeParse(input.resourceId)

  if (!parsedUserId.success) {
    return validationFailure(parsedUserId.error.issues[0]?.message ?? "Invalid user id.")
  }
  if (!parsedCourseId.success) {
    return validationFailure(
      parsedCourseId.error.issues[0]?.message ?? "Invalid course id."
    )
  }
  if (!parsedResourceId.success) {
    return validationFailure(
      parsedResourceId.error.issues[0]?.message ?? "Invalid resource id."
    )
  }

  const access = await canAccessCourse(parsedUserId.data, parsedCourseId.data)
  if (!access.success) {
    return access
  }

  const decision = decideCourseResourceDownloadAccess({
    isAuthenticated: true,
    canAccessCourse: Boolean(access.data),
  })

  if (!decision.allowed) {
    if (decision.reason === "not_entitled") {
      return failure(
        "entitlement_required",
        "You do not have access to download this resource."
      )
    }
    return failure("forbidden", "Download not allowed.")
  }

  try {
    const supabase = createAdminClient()
    const { data: resource, error } = await supabase
      .from("course_resources")
      .select("*")
      .eq("id", parsedResourceId.data)
      .eq("course_id", parsedCourseId.data)
      .eq("status", "published")
      .maybeSingle()

    if (error) {
      return failure("database_error", "Unable to load resource.")
    }
    if (!resource) {
      return failure("not_found", "Resource not found.")
    }

    if (resource.storage_bucket !== COURSE_RESOURCES_BUCKET) {
      return failure("validation_error", "Invalid resource storage configuration.")
    }

    const { data: signed, error: signError } = await supabase.storage
      .from(resource.storage_bucket)
      .createSignedUrl(resource.storage_path, COURSE_RESOURCE_DOWNLOAD_URL_EXPIRES_SECONDS, {
        download: resource.file_name,
      })

    if (signError || !signed?.signedUrl) {
      return failure("provider_error", "Unable to generate download link.")
    }

    return success({
      url: signed.signedUrl,
      fileName: resource.file_name,
      expiresInSeconds: COURSE_RESOURCE_DOWNLOAD_URL_EXPIRES_SECONDS,
    })
  } catch {
    return failure("unknown_error", "Unable to generate download link.")
  }
}
