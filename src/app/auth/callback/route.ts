import { NextResponse } from "next/server"

import { resolveSafeAuthReturnPath } from "@/features/shop/utils/free-claim"
import { createClient } from "@/lib/supabase/server"
import { logger, safeErrorMessage } from "@/server/utils/logger"

export const runtime = "nodejs"

/**
 * Supabase Auth email confirmation / invite / recovery code exchange.
 * Does not grant membership — entitlements remain webhook/outbox owned.
 * Never logs the auth code or tokens.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = resolveSafeAuthReturnPath(requestUrl.searchParams.get("next"))

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=auth_callback_missing_code", requestUrl.origin)
    )
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      logger.warn("Auth callback code exchange failed.", {
        error: safeErrorMessage(error),
      })
      return NextResponse.redirect(
        new URL("/login?error=auth_callback_failed", requestUrl.origin)
      )
    }

    return NextResponse.redirect(new URL(next, requestUrl.origin))
  } catch (error) {
    logger.error("Auth callback threw unexpectedly.", {
      error: safeErrorMessage(error),
    })
    return NextResponse.redirect(
      new URL("/login?error=auth_callback_failed", requestUrl.origin)
    )
  }
}
