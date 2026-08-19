import { NextResponse } from "next/server"

import { processPendingMarketingConsentSyncs } from "@/server/integrations/kit/kit-consent-retry.service"
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
 * Secure retry processor for pending/failed Kit marketing consent syncs.
 * Returns counts only — never recipient emails or API keys.
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Unauthorized." } },
      { status: 401 }
    )
  }

  try {
    const result = await processPendingMarketingConsentSyncs()
    return NextResponse.json({
      success: true,
      data: {
        eligible: result.eligible,
        processed: result.processed,
        synced: result.synced,
        failed: result.failed,
        skipped: result.skipped,
      },
    })
  } catch (error) {
    logger.error("Kit consent sync cron failed.", {
      error: safeErrorMessage(error),
    })
    return NextResponse.json(
      {
        success: false,
        error: { code: "provider_error", message: "Unable to process Kit consent sync." },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
