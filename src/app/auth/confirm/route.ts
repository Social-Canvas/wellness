import { createServerClient } from "@supabase/ssr"
import { type EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import { resolveSafeAuthReturnPath } from "@/features/shop/utils/free-claim"
import {
  getCanonicalAppUrl,
  mapAuthCallbackProviderError,
  resolveAuthRequestOrigin,
  type AuthCallbackErrorCode,
} from "@/lib/config/app-url"
import { env } from "@/lib/config/env"
import { logger, safeErrorMessage } from "@/server/utils/logger"
import type { Database } from "@/types/database/supabase"

export const runtime = "nodejs"

const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
])

function verificationFailedUrl(
  origin: string,
  code: AuthCallbackErrorCode
): URL {
  const url = new URL("/verification-failed", origin)
  url.searchParams.set("reason", code)
  return url
}

export function resolveAuthCallbackOrigin(request: NextRequest): string {
  return resolveAuthRequestOrigin({
    requestOrigin: request.nextUrl.origin,
    configuredAppUrl: (() => {
      try {
        return getCanonicalAppUrl()
      } catch {
        return null
      }
    })(),
  })
}

type CookieToSet = {
  name: string
  value: string
  options?: Parameters<NextResponse["cookies"]["set"]>[2]
}

/**
 * Server-side Auth confirm for PKCE `code` and SSR `token_hash` links.
 * Does not grant membership. Never logs tokens.
 */
export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl
  const origin = resolveAuthCallbackOrigin(request)
  const code = requestUrl.searchParams.get("code")
  const tokenHash = requestUrl.searchParams.get("token_hash")
  const typeParam = requestUrl.searchParams.get("type")
  const next = resolveSafeAuthReturnPath(requestUrl.searchParams.get("next"))
  const providerError = requestUrl.searchParams.get("error")
  const providerErrorCode = requestUrl.searchParams.get("error_code")
  const providerErrorDescription =
    requestUrl.searchParams.get("error_description")

  if (providerError || providerErrorCode) {
    const reason = mapAuthCallbackProviderError({
      error: providerError,
      errorCode: providerErrorCode,
      errorDescription: providerErrorDescription,
    })
    logger.warn("Auth confirm received provider error params.", {
      reason,
      providerError: providerError ?? undefined,
      providerErrorCode: providerErrorCode ?? undefined,
    })
    return NextResponse.redirect(verificationFailedUrl(origin, reason))
  }

  if (!code && !tokenHash) {
    return NextResponse.redirect(
      verificationFailedUrl(origin, "auth_callback_missing_code")
    )
  }

  if (tokenHash && typeParam && !OTP_TYPES.has(typeParam as EmailOtpType)) {
    return NextResponse.redirect(
      verificationFailedUrl(origin, "auth_callback_invalid")
    )
  }

  const cookiesToSet: CookieToSet[] = []

  try {
    const supabase = createServerClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookies) {
            cookies.forEach((cookie) => {
              cookiesToSet.push(cookie)
            })
          },
        },
      }
    )

    let exchangeErrorMessage: string | null = null

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        exchangeErrorMessage = error.message
      }
    } else if (tokenHash && typeParam) {
      const { error } = await supabase.auth.verifyOtp({
        type: typeParam as EmailOtpType,
        token_hash: tokenHash,
      })
      if (error) {
        exchangeErrorMessage = error.message
      }
    }

    if (exchangeErrorMessage) {
      const reason = mapAuthCallbackProviderError({
        exchangeMessage: exchangeErrorMessage,
      })
      logger.warn("Auth confirm exchange failed.", {
        reason,
        error: exchangeErrorMessage,
      })
      return NextResponse.redirect(verificationFailedUrl(origin, reason))
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    let destination = next
    if (
      user?.id &&
      next !== "/reset-password" &&
      !next.startsWith("/reset-password?")
    ) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("certificate_name_locked_at")
        .eq("auth_user_id", user.id)
        .maybeSingle()

      if (!profile?.certificate_name_locked_at) {
        destination = `/certificate-name?next=${encodeURIComponent(next)}`
      }
    }

    const successUrl =
      next === "/reset-password" || next.startsWith("/reset-password?")
        ? new URL("/reset-password", origin)
        : (() => {
            const verified = new URL("/verified", origin)
            verified.searchParams.set("next", destination)
            return verified
          })()

    const redirectResponse = NextResponse.redirect(successUrl)
    cookiesToSet.forEach(({ name, value, options }) => {
      redirectResponse.cookies.set(name, value, options)
    })
    return redirectResponse
  } catch (error) {
    logger.error("Auth confirm threw unexpectedly.", {
      error: safeErrorMessage(error),
    })
    return NextResponse.redirect(
      verificationFailedUrl(origin, "auth_callback_failed")
    )
  }
}
