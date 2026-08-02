import { NextResponse } from "next/server"

import { processLifecycleEmailOutbox } from "@/server/integrations/resend/lifecycle-email-outbox.service"
import { logger, safeErrorMessage } from "@/server/utils/logger"

export const runtime = "nodejs"

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return false
  }
  const header = request.headers.get("authorization")
  if (!header?.startsWith("Bearer ")) {
    return false
  }
  return header.slice("Bearer ".length) === secret
}

/**
 * Secure retry processor for transactional lifecycle emails.
 * Returns counts only — never recipient emails or other PII.
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Unauthorized." } },
      { status: 401 }
    )
  }

  try {
    const result = await processLifecycleEmailOutbox()
    return NextResponse.json({
      success: true,
      data: {
        claimed: result.claimed,
        sent: result.sent,
        skipped: result.skipped,
        retry: result.retry,
        failed: result.failed,
        errors: result.errors,
      },
    })
  } catch (error) {
    logger.error("Transactional email cron failed.", {
      error: safeErrorMessage(error),
    })
    return NextResponse.json(
      {
        success: false,
        error: { code: "provider_error", message: "Unable to process email outbox." },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
