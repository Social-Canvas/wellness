"use client"

import { useState } from "react"

import { signInWithGoogleAction } from "@/features/auth/actions/auth.actions"

const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true"

export function GoogleAuthButton() {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (!googleEnabled) return null

  async function onClick() {
    setPending(true)
    setError(null)
    const result = await signInWithGoogleAction()
    if (!result.success) {
      setError(result.error.message)
      setPending(false)
      return
    }
    window.location.assign(result.data.url)
  }

  return (
    <div className="mb-5 space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="flex w-full items-center justify-center rounded-[var(--radius-button)] border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"
      >
        {pending ? "Opening Google..." : "Continue with Google"}
      </button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
