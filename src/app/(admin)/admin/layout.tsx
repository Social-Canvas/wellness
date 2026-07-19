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
    if (
      (!userResult.success &&
        userResult.error.code === "authentication_required") ||
      (!profileResult.success &&
        profileResult.error.code === "authentication_required")
    ) {
      redirect("/login")
    }

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

  if (
    userResult.data.role !== "admin" &&
    userResult.data.role !== "super_admin"
  ) {
    redirect("/dashboard")
  }

  return (
    <AdminShell user={userResult.data} profile={profileResult.data}>
      {children}
    </AdminShell>
  )
}
