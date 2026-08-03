"use server"

import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  getCurrentProfile,
  getCurrentUser,
} from "@/features/auth/services/auth.service"
import type {
  CreateRecordedSessionInput,
  UpdateRecordedSessionInput,
} from "@/features/recorded-sessions/schemas"
import {
  archiveRecordedSession,
  createRecordedSession,
  publishRecordedSession,
  unpublishRecordedSession,
  updateRecordedSession,
} from "@/features/recorded-sessions/services/recorded-sessions.service"
import type { RecordedSession } from "@/features/recorded-sessions/types"

function revalidateRecordedSessionPaths(sessionId?: string) {
  revalidatePath("/admin/recorded-sessions")
  revalidatePath("/dashboard/recorded-sessions")
  if (sessionId) {
    revalidatePath(`/dashboard/recorded-sessions/${sessionId}`)
  }
}

async function requireAdmin(): Promise<ActionResult<{ userId: string }>> {
  const [userResult, profileResult] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
  ])

  if (!userResult.success) {
    return userResult
  }
  if (!profileResult.success) {
    return profileResult
  }

  if (userResult.data.role !== "admin" && userResult.data.role !== "super_admin") {
    return {
      success: false,
      error: {
        code: "authorization_failed",
        message: "Admin access is required.",
      },
    }
  }

  return { success: true, data: { userId: profileResult.data.id } }
}

export async function createRecordedSessionAction(
  input: CreateRecordedSessionInput
): Promise<ActionResult<RecordedSession>> {
  const admin = await requireAdmin()
  if (!admin.success) return admin

  const result = await createRecordedSession(input)
  if (!result.success) return result

  revalidateRecordedSessionPaths(result.data.id)
  return result
}

export async function updateRecordedSessionAction(
  id: string,
  input: UpdateRecordedSessionInput
): Promise<ActionResult<RecordedSession>> {
  const admin = await requireAdmin()
  if (!admin.success) return admin

  const result = await updateRecordedSession(id, input)
  if (!result.success) return result

  revalidateRecordedSessionPaths(result.data.id)
  return result
}

export async function publishRecordedSessionAction(
  id: string
): Promise<ActionResult<RecordedSession>> {
  const admin = await requireAdmin()
  if (!admin.success) return admin

  const result = await publishRecordedSession(id)
  if (!result.success) return result

  revalidateRecordedSessionPaths(result.data.id)
  return result
}

export async function unpublishRecordedSessionAction(
  id: string
): Promise<ActionResult<RecordedSession>> {
  const admin = await requireAdmin()
  if (!admin.success) return admin

  const result = await unpublishRecordedSession(id)
  if (!result.success) return result

  revalidateRecordedSessionPaths(result.data.id)
  return result
}

export async function archiveRecordedSessionAction(
  id: string
): Promise<ActionResult<RecordedSession>> {
  const admin = await requireAdmin()
  if (!admin.success) return admin

  const result = await archiveRecordedSession(id)
  if (!result.success) return result

  revalidateRecordedSessionPaths(result.data.id)
  return result
}
