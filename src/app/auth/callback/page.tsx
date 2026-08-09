"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { createClient } from "@/lib/supabase/browser"
import { resolveSafeAuthReturnPath } from "@/features/shop/utils/free-claim"

/**
 * Handles GoTrue implicit-flow redirects (`#access_token=...`) that a Route
 * Handler cannot see. PKCE `code` and SSR `token_hash` are forwarded to
 * `/auth/confirm`.
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const [message, setMessage] = useState("Confirming your email…")

  useEffect(() => {
    let cancelled = false

    async function finish() {
      const url = new URL(window.location.href)
      const next = resolveSafeAuthReturnPath(url.searchParams.get("next"))
      const code = url.searchParams.get("code")
      const tokenHash = url.searchParams.get("token_hash")
      const type = url.searchParams.get("type")
      const providerError = url.searchParams.get("error")
      const providerErrorCode = url.searchParams.get("error_code")

      if (providerError || providerErrorCode) {
        router.replace("/verification-failed?reason=auth_callback_denied")
        return
      }

      if (code || tokenHash) {
        const confirm = new URL("/auth/confirm", window.location.origin)
        if (code) confirm.searchParams.set("code", code)
        if (tokenHash) confirm.searchParams.set("token_hash", tokenHash)
        if (type) confirm.searchParams.set("type", type)
        confirm.searchParams.set("next", next)
        window.location.replace(confirm.toString())
        return
      }

      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : ""
      const hashParams = new URLSearchParams(hash)
      const accessToken = hashParams.get("access_token")
      const refreshToken = hashParams.get("refresh_token")
      const hashType = hashParams.get("type")

      if (!accessToken || !refreshToken) {
        router.replace("/verification-failed?reason=auth_callback_missing_code")
        return
      }

      try {
        const supabase = createClient()
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (cancelled) return

        if (error) {
          router.replace("/verification-failed?reason=auth_callback_failed")
          return
        }

        // Clear tokens from the address bar before continuing.
        window.history.replaceState(
          null,
          "",
          `${url.pathname}?next=${encodeURIComponent(next)}`
        )

        if (hashType === "recovery") {
          router.replace("/reset-password")
          return
        }

        const verified = `/verified?next=${encodeURIComponent(next)}`
        router.replace(verified)
      } catch {
        if (!cancelled) {
          router.replace("/verification-failed?reason=auth_callback_failed")
        }
      }
    }

    void finish().catch(() => {
      if (!cancelled) {
        setMessage("We couldn't confirm this email link.")
        router.replace("/verification-failed?reason=auth_callback_failed")
      }
    })

    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-blue-soft px-6">
      <p className="text-sm text-ink-soft">{message}</p>
    </main>
  )
}
