import "server-only"

import { cache } from "react"

import { createAdminClient } from "@/lib/supabase/admin"
import { grantsSuperAdminDemoAccess } from "@/server/services/super-admin-access"

/**
 * True only when the profile row's stored role is super_admin.
 * Lookup failures stay closed: normal entitlement rules continue.
 */
export const profileHasSuperAdminDemoAccess = cache(
  async (profileId: string): Promise<boolean> => {
    try {
      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", profileId)
        .maybeSingle()

      if (error || !data) {
        return false
      }

      return grantsSuperAdminDemoAccess(data.role)
    } catch {
      return false
    }
  }
)
