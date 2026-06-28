import "server-only"

import { randomBytes } from "crypto"

import { z } from "zod"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  getCertificateSchema,
  issueCertificateSchema,
  verifyCertificateSchema,
  type GetCertificateInput,
  type IssueCertificateInput,
  type VerifyCertificateInput,
} from "@/features/certificates/schemas"
import type {
  Certificate,
  CertificateWithCourse,
  VerifiedCertificate,
} from "@/features/certificates/types"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { canAccessCourse } from "@/server/services/entitlement.service"
import type { Database } from "@/types/database/supabase"

const userIdSchema = z.uuid("Invalid user id.")

type CertificateRow = Database["public"]["Tables"]["certificates"]["Row"]

type CertificateWithCourseRow = CertificateRow & {
  courses: Pick<
    Database["public"]["Tables"]["courses"]["Row"],
    "id" | "title" | "slug"
  > | null
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

function firstValidationMessage(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Invalid input."
}

function mapDatabaseError(error: { code?: string; message: string }): ActionResult<never> {
  if (error.code === "PGRST116") {
    return failure("not_found", "Certificate not found.")
  }

  return failure("provider_error", "Unable to process certificate. Please try again.")
}

function mapCertificate(row: CertificateRow): Certificate {
  return {
    id: row.id,
    certificateNumber: row.certificate_number,
    courseId: row.course_id,
    userId: row.user_id,
    issuedAt: row.issued_at,
    verificationToken: row.verification_token,
    pdfStoragePath: row.pdf_storage_path,
  }
}

function mapCertificateWithCourse(row: CertificateWithCourseRow): CertificateWithCourse {
  return {
    ...mapCertificate(row),
    course: {
      id: row.courses?.id ?? row.course_id,
      title: row.courses?.title ?? "Course",
      slug: row.courses?.slug ?? "",
    },
  }
}

function generateCertificateNumber(): string {
  const year = new Date().getUTCFullYear()
  const suffix = randomBytes(4).toString("hex").toUpperCase()

  return `CERT-${year}-${suffix}`
}

function generateVerificationToken(): string {
  return randomBytes(32).toString("hex")
}

async function getExistingCertificate(
  userId: string,
  courseId: string
): Promise<ActionResult<CertificateWithCourse | null>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("certificates")
      .select("*, courses ( id, title, slug )")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle()

    if (error) {
      return mapDatabaseError(error)
    }

    if (!data) {
      return success(null)
    }

    return success(mapCertificateWithCourse(data as CertificateWithCourseRow))
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

async function assertCourseCertificateEligibility(
  userId: string,
  courseId: string
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient()

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, certificate_enabled, status")
      .eq("id", courseId)
      .maybeSingle()

    if (courseError) {
      return mapDatabaseError(courseError)
    }

    if (!course || course.status !== "published") {
      return failure("not_found", "Course not found.")
    }

    if (!course.certificate_enabled) {
      return failure("not_eligible", "This course does not offer certificates.")
    }

    const { data: progress, error: progressError } = await supabase
      .from("course_progress")
      .select("completed_at")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle()

    if (progressError) {
      return mapDatabaseError(progressError)
    }

    if (!progress?.completed_at) {
      return failure("not_eligible", "Complete the course before requesting a certificate.")
    }

    return success(undefined)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function getCertificate(
  userId: string,
  input: GetCertificateInput
): Promise<ActionResult<CertificateWithCourse | null>> {
  const parsedUserId = userIdSchema.safeParse(userId)
  const parsedInput = getCertificateSchema.safeParse(input)

  if (!parsedUserId.success) {
    return validationFailure(firstValidationMessage(parsedUserId.error))
  }

  if (!parsedInput.success) {
    return validationFailure(firstValidationMessage(parsedInput.error))
  }

  const accessResult = await canAccessCourse(parsedUserId.data, parsedInput.data.courseId)

  if (!accessResult.success) {
    return accessResult
  }

  if (!accessResult.data) {
    return failure("entitlement_required", "You do not have access to this course.")
  }

  return getExistingCertificate(parsedUserId.data, parsedInput.data.courseId)
}

export async function getMyCertificates(
  userId: string
): Promise<ActionResult<CertificateWithCourse[]>> {
  const parsedUserId = userIdSchema.safeParse(userId)

  if (!parsedUserId.success) {
    return validationFailure(firstValidationMessage(parsedUserId.error))
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("certificates")
      .select("*, courses ( id, title, slug )")
      .eq("user_id", parsedUserId.data)
      .order("issued_at", { ascending: false })

    if (error) {
      return mapDatabaseError(error)
    }

    return success(
      (data ?? []).map((row) => mapCertificateWithCourse(row as CertificateWithCourseRow))
    )
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function issueCertificate(
  userId: string,
  input: IssueCertificateInput
): Promise<ActionResult<CertificateWithCourse>> {
  const parsedUserId = userIdSchema.safeParse(userId)
  const parsedInput = issueCertificateSchema.safeParse(input)

  if (!parsedUserId.success) {
    return validationFailure(firstValidationMessage(parsedUserId.error))
  }

  if (!parsedInput.success) {
    return validationFailure(firstValidationMessage(parsedInput.error))
  }

  const accessResult = await canAccessCourse(parsedUserId.data, parsedInput.data.courseId)

  if (!accessResult.success) {
    return accessResult
  }

  if (!accessResult.data) {
    return failure("entitlement_required", "You do not have access to this course.")
  }

  const eligibilityResult = await assertCourseCertificateEligibility(
    parsedUserId.data,
    parsedInput.data.courseId
  )

  if (!eligibilityResult.success) {
    return eligibilityResult
  }

  const existingResult = await getExistingCertificate(
    parsedUserId.data,
    parsedInput.data.courseId
  )

  if (!existingResult.success) {
    return existingResult
  }

  if (existingResult.data) {
    return success(existingResult.data)
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("certificates")
      .insert({
        user_id: parsedUserId.data,
        course_id: parsedInput.data.courseId,
        certificate_number: generateCertificateNumber(),
        verification_token: generateVerificationToken(),
      })
      .select("*, courses ( id, title, slug )")
      .single()

    if (error?.code === "23505") {
      const duplicateResult = await getExistingCertificate(
        parsedUserId.data,
        parsedInput.data.courseId
      )

      if (!duplicateResult.success) {
        return duplicateResult
      }

      if (!duplicateResult.data) {
        return failure("provider_error", "Unable to issue certificate. Please try again.")
      }

      return success(duplicateResult.data)
    }

    if (error) {
      return mapDatabaseError(error)
    }

    return success(mapCertificateWithCourse(data as CertificateWithCourseRow))
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function verifyCertificate(
  input: VerifyCertificateInput
): Promise<ActionResult<VerifiedCertificate>> {
  const parsedInput = verifyCertificateSchema.safeParse(input)

  if (!parsedInput.success) {
    return validationFailure(firstValidationMessage(parsedInput.error))
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("certificates")
      .select(
        `
        certificate_number,
        issued_at,
        courses ( title ),
        profiles ( full_name, email )
      `
      )
      .eq("verification_token", parsedInput.data.token)
      .maybeSingle()

    if (error) {
      return mapDatabaseError(error)
    }

    if (!data) {
      return failure("not_found", "Certificate not found.")
    }

    const courseTitle = data.courses?.title ?? "Course"
    const recipientName =
      data.profiles?.full_name?.trim() ||
      data.profiles?.email?.split("@")[0] ||
      "Member"

    return success({
      certificateNumber: data.certificate_number,
      courseTitle,
      recipientName,
      issuedAt: data.issued_at,
    })
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}
