"use client"

import { useEffect, useState } from "react"

import { DISCLAIMER_STORAGE_KEY } from "@/features/checkout/constants/disclaimer"

import { DisclaimerModal } from "./disclaimer-modal"

export function PublicDisclaimerGate() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") {
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
  }, [])

  function handleAccept() {
    sessionStorage.setItem(DISCLAIMER_STORAGE_KEY, "1")
    setOpen(false)
  }

  return (
    <DisclaimerModal
      open={open}
      onOpenChange={setOpen}
      onAccept={handleAccept}
    />
  )
}
