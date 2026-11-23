"use client"

import { useTransition } from "react"

import { Button } from "@/components/ui"
import { signOutAction } from "@/features/auth/actions/auth.actions"

export function SignOutButton() {
  const [isPending, startTransition] = useTransition()

  function handleSignOut() {
    startTransition(async () => {
      const result = await signOutAction()
      if (result.success) {
        window.location.assign("/login")
      }
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={handleSignOut}
    >
      {isPending ? "Signing out…" : "Sign out"}
    </Button>
  )
}
