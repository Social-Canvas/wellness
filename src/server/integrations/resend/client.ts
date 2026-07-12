import "server-only"

import { Resend } from "resend"

import { env } from "@/lib/config"

let resendClient: Resend | null = null

export function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY)
  }

  return resendClient
}
