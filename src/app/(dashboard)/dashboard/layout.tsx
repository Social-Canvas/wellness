import type { Metadata } from "next"
import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import {
  getCurrentProfile,
  getCurrentUser,
} from "@/features/auth/services/auth.service"
import { DashboardShell } from "@/features/dashboard/components"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your member dashboard.",
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [userResult, profileResult] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
  ])

  if (!userResult.success || !profileResult.success) {
    const message = !userResult.success
      ? userResult.error.message
      : !profileResult.success
        ? profileResult.error.message
        : "Unable to load your account profile."

    return (
      <div className="mx-auto mt-9 max-w-lg rounded-2xl border border-line bg-surface px-6 py-6">
        <p className="font-display text-lg font-medium text-ink">Account setup issue</p>
        <p className="mt-2 text-sm text-ink-soft">{message}</p>
      </div>
    )
  }

  return (
    <DashboardShell user={userResult.data} profile={profileResult.data}>
      {children}
    </DashboardShell>
  )
}
