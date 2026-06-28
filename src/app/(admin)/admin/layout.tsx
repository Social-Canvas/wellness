import type { Metadata } from "next"
import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import {
  getCurrentProfile,
  getCurrentUser,
} from "@/features/auth/services/auth.service"
import { AdminShell } from "@/features/admin/components"

export const metadata: Metadata = {
  title: "Admin",
  description: "Platform administration.",
}

export default async function AdminLayout({
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

  // TODO: Restrict access to admin and super_admin roles.

  return (
    <AdminShell user={userResult.data} profile={profileResult.data}>
      {children}
    </AdminShell>
  )
}
