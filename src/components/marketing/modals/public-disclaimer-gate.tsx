"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import { DISCLAIMER_STORAGE_KEY } from "@/features/checkout/constants/disclaimer"

import { DisclaimerModal } from "./disclaimer-modal"

const DISCLAIMER_PATH_PREFIXES = ["/programs", "/shop", "/checkout", "/free-taster", "/vip"]

function shouldShowDisclaimer(pathname: string | null): boolean {
  if (!pathname) {
    return false
  }

  return DISCLAIMER_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function PublicDisclaimerGate() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !shouldShowDisclaimer(pathname)) {
      return
    }

    if (sessionStorage.getItem(DISCLAIMER_STORAGE_KEY)) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setOpen(true)
    }, 400)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [pathname])

  function handleAccept() {
    sessionStorage.setItem(DISCLAIMER_STORAGE_KEY, "1")
    setOpen(false)
  }

  if (!shouldShowDisclaimer(pathname)) {
    return null
  }

  return (
    <DisclaimerModal
      open={open}
      onOpenChange={setOpen}
      onAccept={handleAccept}
    />
  )
}
