import type { Metadata } from "next"
import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import {
  getCurrentProfile,
  getCurrentUser,
} from "@/features/auth/services/auth.service"
import { DashboardShell } from "@/features/dashboard/components"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your member dashboard.",
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const [userResult, profileResult] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
  ])

  if (!userResult.success || !profileResult.success) {
    redirect("/login")
  }

  return (
    <DashboardShell user={userResult.data} profile={profileResult.data}>
      {children}
    </DashboardShell>
  )
}
