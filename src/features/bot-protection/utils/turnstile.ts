export type TurnstileConfig = {
  siteKey: string | null
  secretKey: string | null
  isProduction: boolean
}

export type TurnstileVerifyResult =
  | { ok: true; skipped: boolean }
  | { ok: false; code: "turnstile_required" | "turnstile_failed" }

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim()
  return value ? value : null
}

export function getTurnstileConfig(): TurnstileConfig {
  return {
    siteKey: readEnv("TURNSTILE_SITE_KEY") ?? readEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY"),
    secretKey: readEnv("TURNSTILE_SECRET_KEY"),
    isProduction: process.env.NODE_ENV === "production",
  }
}

export function isTurnstileConfigured(
  config: TurnstileConfig = getTurnstileConfig()
): boolean {
  return Boolean(config.siteKey && config.secretKey)
}

/**
 * Skip the challenge when keys are unset.
 * Non-prod: always skip if unset (local tests).
 * Production: also skip if unset so existing forms keep working until keys are added.
 */
export function shouldSkipTurnstile(
  config: TurnstileConfig = getTurnstileConfig()
): boolean {
  return !isTurnstileConfigured(config)
}

type SiteVerifyResponse = {
  success?: boolean
}

export async function verifyTurnstileToken(
  input: {
    token: string | null | undefined
    ip?: string | null
  },
  config: TurnstileConfig = getTurnstileConfig(),
  fetcher: typeof fetch = fetch
): Promise<TurnstileVerifyResult> {
  if (shouldSkipTurnstile(config)) {
    return { ok: true, skipped: true }
  }

  const token = input.token?.trim()
  if (!token) {
    return { ok: false, code: "turnstile_required" }
  }

  const body = new URLSearchParams()
  body.set("secret", config.secretKey ?? "")
  body.set("response", token)
  if (input.ip && input.ip !== "unknown") {
    body.set("remoteip", input.ip)
  }

  try {
    const response = await fetcher(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      }
    )
    const payload = (await response.json()) as SiteVerifyResponse
    if (payload.success === true) {
      return { ok: true, skipped: false }
    }
    return { ok: false, code: "turnstile_failed" }
  } catch {
    return { ok: false, code: "turnstile_failed" }
  }
}

export const TURNSTILE_USER_ERROR =
  "Please confirm you are human and try again." as const
