import "server-only"

import Mux from "@mux/mux-node"

import { env } from "@/lib/config"

let muxClient: Mux | null = null

function normalizePrivateKey(privateKey: string): string {
  return privateKey.replace(/\\n/g, "\n")
}

export function getMuxClient(): Mux {
  if (!muxClient) {
    muxClient = new Mux({
      tokenId: env.MUX_TOKEN_ID,
      tokenSecret: env.MUX_TOKEN_SECRET,
      webhookSecret: env.MUX_WEBHOOK_SECRET,
      jwtSigningKey: env.MUX_SIGNING_KEY_ID,
      jwtPrivateKey: normalizePrivateKey(env.MUX_SIGNING_PRIVATE_KEY),
    })
  }

  return muxClient
}
