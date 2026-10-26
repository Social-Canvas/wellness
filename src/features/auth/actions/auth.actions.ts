"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import type {
  ForgotPasswordInput,
  LoginInput,
  ResendVerificationInput,
  ResetPasswordInput,
  SignupInput,
  UpdateProfileInput,
} from "@/features/auth/schemas"
import {
  forgotPassword,
  resendVerificationEmail,
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
import { consumePublicFormRateLimit } from "@/features/bot-protection/services/public-form-rate-limit.service"
import {
  AUTH_EMAIL_RATE_LIMIT_POLICY,
  RATE_LIMIT_USER_ERROR,
  SIGNUP_RATE_LIMIT_POLICY,
  type RateLimitPolicy,
} from "@/features/bot-protection/utils/durable-rate-limit"
import {
  isSignupRateLimited,
  recordSignupAttempt,
} from "@/features/bot-protection/utils/signup-rate-limit"
import {
  TURNSTILE_USER_ERROR,
  verifyTurnstileToken,
} from "@/features/bot-protection/utils/turnstile"
import { resolveClientIp } from "@/lib/http/client-ip"
import { resolveSafeAuthReturnPath } from "@/features/shop/utils/free-claim"

function rateLimitedResult(): ActionResult<never> {
  return {
    success: false,
    error: {
      code: "rate_limited",
      message: RATE_LIMIT_USER_ERROR,
    },
  }
}

async function consumeDurableAuthRateLimit(
  policy: RateLimitPolicy,
  email: string,
  ip: string
): Promise<boolean> {
  const durable = await consumePublicFormRateLimit({ policy, email, ip })
  return durable === "limited"
}

export async function signUpAction(
  input: SignupInput
): Promise<ActionResult<SignUpResult>> {
  const clientIp = await resolveClientIp()
  const turnstile = await verifyTurnstileToken({
    token: input.turnstileToken,
    ip: clientIp,
  })
  if (!turnstile.ok) {
    return {
      success: false,
      error: { code: turnstile.code, message: TURNSTILE_USER_ERROR },
    }
  }

  if (await consumeDurableAuthRateLimit(SIGNUP_RATE_LIMIT_POLICY, input.email, clientIp)) {
    return rateLimitedResult()
  }
  if (isSignupRateLimited(input.email, clientIp)) {
    return rateLimitedResult()
  }
  recordSignupAttempt(input.email, clientIp)

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

  const safeRedirect = resolveSafeAuthReturnPath(redirectTo)

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
  const clientIp = await resolveClientIp()
  if (await consumeDurableAuthRateLimit(AUTH_EMAIL_RATE_LIMIT_POLICY, input.email, clientIp)) {
    return rateLimitedResult()
  }
  return forgotPassword(input)
}

export async function resendVerificationAction(
  input: ResendVerificationInput
): Promise<ActionResult<null>> {
  const clientIp = await resolveClientIp()
  if (await consumeDurableAuthRateLimit(AUTH_EMAIL_RATE_LIMIT_POLICY, input.email, clientIp)) {
    return rateLimitedResult()
  }
  return resendVerificationEmail(input)
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
