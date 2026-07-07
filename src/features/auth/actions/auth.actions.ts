"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import type {
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  SignupInput,
  UpdateProfileInput,
} from "@/features/auth/schemas"
import {
  forgotPassword,
  resetPassword,
  signIn,
  signOut,
  signUp,
  updateProfile,
  type ActionResult,
  type ProfileView,
  type SignInResult,
  type SignUpResult,
} from "@/features/auth/services/auth.service"

export async function signUpAction(
  input: SignupInput
): Promise<ActionResult<SignUpResult>> {
  const result = await signUp(input)

  if (result.success && !result.data.requiresEmailConfirmation) {
    revalidatePath("/", "layout")
  }

  return result
}

export async function signInAction(
  input: LoginInput,
  redirectTo?: string
): Promise<ActionResult<SignInResult>> {
  const result = await signIn(input)

  if (!result.success) {
    return result
  }

  revalidatePath("/", "layout")

  const safeRedirect =
    redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/dashboard"

  redirect(safeRedirect)
}

export async function signOutAction(): Promise<ActionResult<null>> {
  const result = await signOut()

  if (!result.success) {
    return result
  }

  revalidatePath("/", "layout")
  redirect("/login")
}

export async function forgotPasswordAction(
  input: ForgotPasswordInput
): Promise<ActionResult<null>> {
  return forgotPassword(input)
}

export async function resetPasswordAction(
  input: ResetPasswordInput
): Promise<ActionResult<null>> {
  const result = await resetPassword(input)

  if (!result.success) {
    return result
  }

  revalidatePath("/", "layout")
  return result
}

export async function updateProfileAction(
  input: UpdateProfileInput
): Promise<ActionResult<ProfileView>> {
  const result = await updateProfile(input)

  if (!result.success) {
    return result
  }

  revalidatePath("/dashboard", "layout")
  return result
}
