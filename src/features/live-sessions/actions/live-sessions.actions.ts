"use server"

import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  getCurrentProfile,
  getCurrentUser,
} from "@/features/auth/services/auth.service"
import type {
  CreateLiveSessionInput,
  CreateLiveTrialCheckoutInput,
  LiveSessionFeedbackInput,
  UpdateLiveSessionInput,
} from "@/features/live-sessions/schemas"
import {
  createLiveSessionSchema,
  createLiveTrialCheckoutSchema,
  liveSessionFeedbackSchema,
  updateLiveSessionSchema,
} from "@/features/live-sessions/schemas"
import {
  attachRecordingToCompletedLiveSession,
  createLiveSession,
  issueMemberJoinUrl,
  issueTrialJoinUrl,
  markLiveSessionCompleted,
  submitLiveSessionFeedback,
  updateLiveSession,
} from "@/features/live-sessions/services/live-sessions.service"
import { createLiveBreathworkTrialCheckoutSession } from "@/features/live-sessions/services/live-trial-checkout.service"
import type {
  LiveSessionAdmin,
  LiveSessionJoinResult,
  LiveSessionPublic,
} from "@/features/live-sessions/types"

function revalidateLivePaths(liveClassId?: string) {
  revalidatePath("/admin/live-sessions")
  revalidatePath("/dashboard/live-sessions")
  if (liveClassId) {
    revalidatePath(`/dashboard/live-sessions/${liveClassId}`)
    revalidatePath(`/dashboard/live-sessions/${liveClassId}/join`)
  }
}

async function requireUser(): Promise<ActionResult<{ userId: string }>> {
  const profileResult = await getCurrentProfile()
  if (!profileResult.success) {
    return profileResult
  }
  return { success: true, data: { userId: profileResult.data.id } }
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

export async function createLiveSessionAction(
  input: CreateLiveSessionInput
): Promise<ActionResult<LiveSessionAdmin>> {
  const admin = await requireAdmin()
  if (!admin.success) return admin

  const parsed = createLiveSessionSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    }
  }

  const result = await createLiveSession(parsed.data)
  if (result.success) {
    revalidateLivePaths(result.data.id)
  }
  return result
}

export async function updateLiveSessionAction(
  id: string,
  input: UpdateLiveSessionInput
): Promise<ActionResult<LiveSessionPublic>> {
  const admin = await requireAdmin()
  if (!admin.success) return admin

  const parsed = updateLiveSessionSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    }
  }

  const result = await updateLiveSession(id, parsed.data)
  if (result.success) {
    revalidateLivePaths(result.data.id)
  }
  return result
}

export async function completeLiveSessionAction(
  liveClassId: string
): Promise<ActionResult<{ completed: true }>> {
  const admin = await requireAdmin()
  if (!admin.success) return admin

  const result = await markLiveSessionCompleted(liveClassId)
  if (result.success) {
    revalidateLivePaths(liveClassId)
  }
  return result
}

export async function attachRecordingToLiveSessionAction(input: {
  liveClassId: string
  recordedSessionId: string
}): Promise<ActionResult<{ linked: true }>> {
  const admin = await requireAdmin()
  if (!admin.success) return admin

  const result = await attachRecordingToCompletedLiveSession(input)
  if (result.success) {
    revalidateLivePaths(input.liveClassId)
    revalidatePath("/admin/recorded-sessions")
    revalidatePath("/dashboard/recorded-sessions")
  }
  return result
}

export async function issueMemberJoinUrlAction(
  liveClassId: string
): Promise<ActionResult<LiveSessionJoinResult>> {
  const user = await requireUser()
  if (!user.success) return user

  return issueMemberJoinUrl(user.data.userId, liveClassId)
}

export async function issueTrialJoinUrlAction(
  liveClassId: string
): Promise<ActionResult<LiveSessionJoinResult>> {
  const user = await requireUser()
  if (!user.success) return user

  return issueTrialJoinUrl(user.data.userId, liveClassId)
}

export async function createLiveBreathworkTrialCheckoutAction(
  input: CreateLiveTrialCheckoutInput
): Promise<
  ActionResult<{ sessionId: string | null; url: string; alreadyEntitled: boolean }>
> {
  const user = await requireUser()
  if (!user.success) return user

  const parsed = createLiveTrialCheckoutSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    }
  }

  return createLiveBreathworkTrialCheckoutSession(user.data.userId, parsed.data)
}

export async function submitLiveSessionFeedbackAction(
  input: LiveSessionFeedbackInput
): Promise<
  ActionResult<{ feedbackId: string; membershipCtaPath: string | null }>
> {
  const user = await requireUser()
  if (!user.success) return user

  const parsed = liveSessionFeedbackSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "validation_error",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
    }
  }

  return submitLiveSessionFeedback(user.data.userId, parsed.data)
}
