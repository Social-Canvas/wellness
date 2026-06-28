import "server-only"

import type { AuthError, SupabaseClient } from "@supabase/supabase-js"

import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  updateProfileSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type ResetPasswordInput,
  type SignupInput,
  type UpdateProfileInput,
} from "@/features/auth/schemas"
import type { AuthSessionUser, Profile, UserRole } from "@/features/auth/types"
import { env } from "@/lib/config"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database/supabase"

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } }

export interface ProfileView {
  id: string
  authUserId: string
  email: string
  fullName: string | null
  phone: string | null
  avatarUrl: string | null
  role: UserRole
  stripeCustomerId: string | null
  createdAt: string
  updatedAt: string
}

export interface SignInResult {
  user: AuthSessionUser
  profile: ProfileView
}

export interface SignUpResult {
  requiresEmailConfirmation: boolean
  email: string
  profile?: ProfileView
}

type ServerSupabaseClient = SupabaseClient<Database>

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

function mapProfile(row: Profile): ProfileView {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    role: row.role,
    stripeCustomerId: row.stripe_customer_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapUpdateProfileInput(
  input: UpdateProfileInput
): Database["public"]["Tables"]["profiles"]["Update"] {
  const updates: Database["public"]["Tables"]["profiles"]["Update"] = {
    full_name: input.fullName,
  }

  if (input.phone !== undefined) {
    updates.phone = input.phone || null
  }

  if (input.avatarUrl !== undefined) {
    updates.avatar_url = input.avatarUrl || null
  }

  return updates
}

function mapAuthError(error: AuthError): ActionResult<never> {
  const normalized = error.message.toLowerCase()

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid email or password")
  ) {
    return failure("authentication_required", "Invalid email or password.")
  }

  if (normalized.includes("user already registered")) {
    return failure("validation_error", "An account with this email already exists.")
  }

  if (normalized.includes("email not confirmed")) {
    return failure(
      "authentication_required",
      "Please confirm your email before signing in."
    )
  }

  if (error.status === 429) {
    return failure("rate_limited", "Too many requests. Please try again later.")
  }

  return failure("provider_error", "Something went wrong. Please try again.")
}

async function fetchProfileByAuthUserId(
  supabase: ServerSupabaseClient,
  authUserId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data
}

async function buildAuthSessionUser(
  supabase: ServerSupabaseClient,
  authUserId: string,
  email: string
): Promise<AuthSessionUser | null> {
  const profile = await fetchProfileByAuthUserId(supabase, authUserId)

  if (!profile) {
    return null
  }

  return {
    id: authUserId,
    email,
    role: profile.role,
  }
}

export async function signUp(
  input: SignupInput
): Promise<ActionResult<SignUpResult>> {
  const parsed = signupSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
    })

    if (error) {
      return mapAuthError(error)
    }

    if (!data.user) {
      return failure("provider_error", "Unable to create your account. Please try again.")
    }

    if (!data.session) {
      return success({
        requiresEmailConfirmation: true,
        email: parsed.data.email,
      })
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: parsed.data.fullName })
      .eq("auth_user_id", data.user.id)

    if (profileError) {
      return failure(
        "provider_error",
        "Your account was created, but we could not save your profile. Please try again."
      )
    }

    const profile = await fetchProfileByAuthUserId(supabase, data.user.id)

    if (!profile) {
      return failure("not_found", "Profile not found.")
    }

    return success({
      requiresEmailConfirmation: false,
      email: parsed.data.email,
      profile: mapProfile(profile),
    })
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function signIn(
  input: LoginInput
): Promise<ActionResult<SignInResult>> {
  const parsed = loginSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })

    if (error) {
      return mapAuthError(error)
    }

    if (!data.user?.email) {
      return failure("authentication_required", "Invalid email or password.")
    }

    const user = await buildAuthSessionUser(
      supabase,
      data.user.id,
      data.user.email
    )

    if (!user) {
      return failure("not_found", "Profile not found.")
    }

    const profile = await fetchProfileByAuthUserId(supabase, data.user.id)

    if (!profile) {
      return failure("not_found", "Profile not found.")
    }

    return success({
      user,
      profile: mapProfile(profile),
    })
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function signOut(): Promise<ActionResult<null>> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return mapAuthError(error)
    }

    return success(null)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function forgotPassword(
  input: ForgotPasswordInput
): Promise<ActionResult<null>> {
  const parsed = forgotPasswordSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/reset-password`,
    })

    if (error?.status === 429) {
      return failure("rate_limited", "Too many requests. Please try again later.")
    }

    return success(null)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function resetPassword(
  input: ResetPasswordInput
): Promise<ActionResult<null>> {
  const parsed = resetPasswordSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return failure(
        "authentication_required",
        "Your reset link is invalid or has expired. Please request a new one."
      )
    }

    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    })

    if (error) {
      return mapAuthError(error)
    }

    return success(null)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function getCurrentUser(): Promise<ActionResult<AuthSessionUser>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user?.email) {
      return failure("authentication_required", "You must be signed in.")
    }

    const sessionUser = await buildAuthSessionUser(supabase, user.id, user.email)

    if (!sessionUser) {
      return failure("not_found", "Profile not found.")
    }

    return success(sessionUser)
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function getCurrentProfile(): Promise<ActionResult<ProfileView>> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return failure("authentication_required", "You must be signed in.")
    }

    const profile = await fetchProfileByAuthUserId(supabase, user.id)

    if (!profile) {
      return failure("not_found", "Profile not found.")
    }

    return success(mapProfile(profile))
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function updateProfile(
  input: UpdateProfileInput
): Promise<ActionResult<ProfileView>> {
  const parsed = updateProfileSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return failure("authentication_required", "You must be signed in.")
    }

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update(mapUpdateProfileInput(parsed.data))
      .eq("auth_user_id", user.id)
      .select("*")
      .single()

    if (updateError || !data) {
      return failure(
        "provider_error",
        "Unable to update your profile. Please try again."
      )
    }

    return success(mapProfile(data))
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}
