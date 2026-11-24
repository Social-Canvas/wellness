"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

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
import { env } from "@/lib/config"
import { resolveClientIp } from "@/lib/http/client-ip"
import { createClient } from "@/lib/supabase/server"
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
): Promise<ActionResult<SignInResult & { redirectTo: string }>> {
  const result = await signIn(input)

  if (!result.success) {
    return result
  }

  revalidatePath("/", "layout")

  return {
    success: true,
    data: {
      ...result.data,
      redirectTo: resolveSafeAuthReturnPath(redirectTo),
    },
  }
}

export async function signOutAction(): Promise<ActionResult<null>> {
  const result = await signOut()

  if (!result.success) {
    return result
  }

  revalidatePath("/", "layout")
  return result
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

export async function signInWithGoogleAction(): Promise<ActionResult<{ url: string }>> {
  const headerList = await headers()
  const origin = headerList.get("origin") ?? env.NEXT_PUBLIC_APP_URL
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: { prompt: "select_account" },
    },
  })

  if (error || !data.url) {
    return {
      success: false,
      error: {
        code: "provider_error",
        message: "Google sign-in is not available yet.",
      },
    }
  }

  return { success: true, data: { url: data.url } }
}
