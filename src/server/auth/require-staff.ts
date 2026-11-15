import "server-only"

import {
  getCurrentUser,
  type ActionResult,
} from "@/features/auth/services/auth.service"
import type { AuthSessionUser } from "@/features/auth/types"

const STAFF_ROLES = new Set(["admin", "super_admin"])

export async function requireStaffActor(): Promise<ActionResult<AuthSessionUser>> {
  const userResult = await getCurrentUser()

  if (!userResult.success) {
    return userResult
  }

  if (!STAFF_ROLES.has(userResult.data.role)) {
    return {
      success: false,
      error: {
        code: "forbidden",
        message: "You do not have permission to manage this.",
      },
    }
  }

  return userResult
}
