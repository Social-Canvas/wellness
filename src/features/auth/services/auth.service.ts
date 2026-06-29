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
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { logger, safeErrorMessage } from "@/server/utils/logger"
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

function mapDatabaseError(error: { code?: string; message: string; details?: string; hint?: string }): ActionResult<never> {
  logger.error("[auth] Supabase profile database error", {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  })

  if (error.code === "23505") {
    return failure("provider_error", "Profile record conflict. Please try again.")
  }

  return failure("provider_error", "Unable to load your profile. Please try again.")
}

type FetchProfileResult =
  | { status: "found"; profile: Profile }
  | { status: "not_found" }
  | { status: "error"; error: { code?: string; message: string; details?: string; hint?: string } }

async function fetchProfileByAuthUserId(
  supabase: ServerSupabaseClient,
  authUserId: string
): Promise<FetchProfileResult> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", authUserId)
    .maybeSingle()

  if (error) {
    if (error.code === "PGRST116") {
      return { status: "not_found" }
    }

    logger.error("[auth] Failed to load profile by auth_user_id", {
      authUserId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })

    return { status: "error", error }
  }

  if (!data) {
    return { status: "not_found" }
  }

  return { status: "found", profile: data }
}

async function applyAuthenticatedSession(
  supabase: ServerSupabaseClient,
  session: { access_token: string; refresh_token: string }
): Promise<void> {
  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })

  if (error) {
    logger.error("[auth] Failed to apply authenticated session", {
      code: error.code,
      message: error.message,
    })
  }
}

async function loadProfileForAuthUser(
  supabase: ServerSupabaseClient,
  authUserId: string,
  email: string,
  options?: { fullName?: string | null; allowRepair?: boolean }
): Promise<ActionResult<Profile>> {
  const fetchResult = await fetchProfileByAuthUserId(supabase, authUserId)

  if (fetchResult.status === "found") {
    const existingProfile = fetchResult.profile

    if (options?.fullName && !existingProfile.full_name) {
      const { data, error } = await supabase
        .from("profiles")
        .update({ full_name: options.fullName })
        .eq("auth_user_id", authUserId)
        .select("*")
        .single()

      if (error) {
        logger.error("[auth] Failed to update profile full_name", {
          authUserId,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        })
        return success(existingProfile)
      }

      if (data) {
        return success(data)
      }
    }

    return success(existingProfile)
  }

  if (fetchResult.status === "error") {
    return mapDatabaseError(fetchResult.error)
  }

  if (!options?.allowRepair) {
    return failure("not_found", "Profile not found.")
  }

  return repairMissingProfile(supabase, authUserId, email, options?.fullName)
}

async function repairMissingProfile(
  supabase: ServerSupabaseClient,
  authUserId: string,
  email: string,
  fullName?: string | null
): Promise<ActionResult<Profile>> {
  const refetchedProfile = await fetchProfileByAuthUserId(supabase, authUserId)

  if (refetchedProfile.status === "found") {
    return success(refetchedProfile.profile)
  }

  if (refetchedProfile.status === "error") {
    return mapDatabaseError(refetchedProfile.error)
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from("profiles")
      .insert({
        auth_user_id: authUserId,
        email,
        full_name: fullName ?? null,
        role: "user",
      })
      .select("*")
      .single()

    if (error?.code === "23505") {
      const existingAfterConflict = await fetchProfileByAuthUserId(supabase, authUserId)

      if (existingAfterConflict.status === "found") {
        return success(existingAfterConflict.profile)
      }

      if (existingAfterConflict.status === "error") {
        return mapDatabaseError(existingAfterConflict.error)
      }

      return mapDatabaseError(error)
    }

    if (error || !data) {
      return error
        ? mapDatabaseError(error)
        : failure("provider_error", "Unable to create your profile.")
    }

    return success(data)
  } catch (caughtError) {
    logger.error("[auth] Unexpected error while repairing profile", {
      error: safeErrorMessage(caughtError),
    })
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

function buildAuthSessionUser(
  profile: Profile,
  authUserId: string,
  email: string
): AuthSessionUser {
  return {
    id: authUserId,
    email,
    role: profile.role,
  }
}

async function getAuthenticatedAuthUser(
  supabase: ServerSupabaseClient
): Promise<ActionResult<{ id: string; email: string; fullName: string | null }>> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user?.email) {
    return failure("authentication_required", "You must be signed in.")
  }

  const metadata = user.user_metadata as { full_name?: string | null } | undefined

  return success({
    id: user.id,
    email: user.email,
    fullName: metadata?.full_name ?? null,
  })
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

    await applyAuthenticatedSession(supabase, data.session)

    const profileResult = await loadProfileForAuthUser(
      supabase,
      data.user.id,
      parsed.data.email,
      { fullName: parsed.data.fullName, allowRepair: true }
    )

    if (!profileResult.success) {
      return profileResult
    }

    return success({
      requiresEmailConfirmation: false,
      email: parsed.data.email,
      profile: mapProfile(profileResult.data),
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

    if (data.session) {
      await applyAuthenticatedSession(supabase, data.session)
    }

    const profileResult = await loadProfileForAuthUser(
      supabase,
      data.user.id,
      data.user.email,
      { allowRepair: true }
    )

    if (!profileResult.success) {
      return profileResult
    }

    return success({
      user: buildAuthSessionUser(profileResult.data, data.user.id, data.user.email),
      profile: mapProfile(profileResult.data),
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
    const authUserResult = await getAuthenticatedAuthUser(supabase)

    if (!authUserResult.success) {
      return authUserResult
    }

    const profileResult = await loadProfileForAuthUser(
      supabase,
      authUserResult.data.id,
      authUserResult.data.email,
      { fullName: authUserResult.data.fullName, allowRepair: true }
    )

    if (!profileResult.success) {
      return profileResult
    }

    return success(
      buildAuthSessionUser(
        profileResult.data,
        authUserResult.data.id,
        authUserResult.data.email
      )
    )
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function getCurrentProfile(): Promise<ActionResult<ProfileView>> {
  try {
    const supabase = await createClient()
    const authUserResult = await getAuthenticatedAuthUser(supabase)

    if (!authUserResult.success) {
      return authUserResult
    }

    const profileResult = await loadProfileForAuthUser(
      supabase,
      authUserResult.data.id,
      authUserResult.data.email,
      { fullName: authUserResult.data.fullName, allowRepair: true }
    )

    if (!profileResult.success) {
      return profileResult
    }

    return success(mapProfile(profileResult.data))
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
