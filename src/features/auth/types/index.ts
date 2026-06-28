import type { Database } from "@/types/database/supabase"

export type UserRole = Database["public"]["Enums"]["user_role"]

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]

/** Profile fields members may update through account settings. */
export type UpdatableProfileFields = Pick<
  Profile,
  "full_name" | "phone" | "avatar_url"
>

export interface AuthSessionUser {
  id: string
  email: string
  role: UserRole
}
