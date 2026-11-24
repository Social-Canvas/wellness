"use client"

import { useEffect } from "react"

import { ATTRIBUTION_COOKIE } from "@/lib/attribution/cookie-name"
import { readUtmFromSearchParams, utmToMetadata } from "@/lib/attribution/utm"

export function AttributionCapture() {
  useEffect(() => {
    const incoming = readUtmFromSearchParams(new URLSearchParams(window.location.search))
    const incomingMetadata = utmToMetadata(incoming)
    if (Object.keys(incomingMetadata).length === 0) return

    const existing = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${ATTRIBUTION_COOKIE}=`))
    if (existing) return

    const secure = window.location.protocol === "https:" ? "; Secure" : ""
    document.cookie = `${ATTRIBUTION_COOKIE}=${encodeURIComponent(JSON.stringify(incomingMetadata))}; Path=/; Max-Age=2592000; SameSite=Lax${secure}`
  }, [])

  return null
}
