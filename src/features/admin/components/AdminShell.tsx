"use client"

import { useState, type ReactNode } from "react"

import type { AuthSessionUser } from "@/features/auth/types"
import type { ProfileView } from "@/features/auth/services/auth.service"

import { AdminHeader } from "./AdminHeader"
import { AdminSidebar } from "./AdminSidebar"

interface AdminShellProps {
  user: AuthSessionUser
  profile: ProfileView
  children: ReactNode
}

export function AdminShell({ user, profile, children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  function closeMobileNav() {
    setMobileOpen(false)
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="flex min-h-screen">
        <AdminSidebar mobileOpen={mobileOpen} onNavigate={closeMobileNav} />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <AdminHeader
            user={user}
            profile={profile}
            mobileOpen={mobileOpen}
            onToggleMenu={() => setMobileOpen((open) => !open)}
          />

          <main className="flex-1 px-4 py-6 lg:px-6 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
