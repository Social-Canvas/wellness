"use client"

import { useEffect, useId, useRef } from "react"

import { useTurnstileSiteKey } from "./turnstile-config"

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      callback: (token: string) => void
      "expired-callback": () => void
      "error-callback": () => void
      theme?: "auto" | "light" | "dark"
    }
  ) => string
  reset: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

type TurnstileFieldProps = {
  onTokenChange: (token: string) => void
  className?: string
}

export function TurnstileField({ onTokenChange, className }: TurnstileFieldProps) {
  const siteKey = useTurnstileSiteKey()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const labelId = useId()

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      return
    }

    let cancelled = false

    function renderWidget() {
      if (cancelled || !containerRef.current || !window.turnstile || !siteKey) {
        return
      }
      if (widgetIdRef.current) {
        return
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => onTokenChange(token),
        "expired-callback": () => onTokenChange(""),
        "error-callback": () => onTokenChange(""),
        theme: "auto",
      })
    }

    if (window.turnstile) {
      renderWidget()
      return () => {
        cancelled = true
      }
    }

    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-elevate-turnstile='true']"
    )
    if (existing) {
      existing.addEventListener("load", renderWidget)
      return () => {
        cancelled = true
        existing.removeEventListener("load", renderWidget)
      }
    }

    const script = document.createElement("script")
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
    script.async = true
    script.defer = true
    script.dataset.elevateTurnstile = "true"
    script.addEventListener("load", renderWidget)
    document.head.appendChild(script)

    return () => {
      cancelled = true
      script.removeEventListener("load", renderWidget)
    }
  }, [onTokenChange, siteKey])

  if (!siteKey) {
    return null
  }

  return (
    <div className={className}>
      <p id={labelId} className="sr-only">
        Human verification challenge
      </p>
      <div ref={containerRef} aria-labelledby={labelId} />
    </div>
  )
}
