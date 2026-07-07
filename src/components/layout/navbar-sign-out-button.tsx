"use client"

import { useTransition } from "react"

import { buttonVariants } from "@/components/ui/button"
import { signOutAction } from "@/features/auth/actions/auth.actions"
import { cn } from "@/lib/utils"

function NavbarSignOutButton() {
  const [isPending, startTransition] = useTransition()

  function handleSignOut() {
    startTransition(async () => {
      await signOutAction()
    })
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleSignOut}
      className={cn(buttonVariants({ variant: "default", size: "sm" }))}
    >
      {isPending ? "Signing out…" : "Log out"}
    </button>
  )
}

export { NavbarSignOutButton }
