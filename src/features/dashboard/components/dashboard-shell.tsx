import type { ReactNode } from "react"

import { Badge } from "@/components/ui"
import { Container, Section } from "@/components/layout"
import type { AuthSessionUser } from "@/features/auth/types"
import type { ProfileView } from "@/features/auth/services/auth.service"

import { SignOutButton } from "./sign-out-button"

interface DashboardShellProps {
  user: AuthSessionUser
  profile: ProfileView
  children: ReactNode
}

export function DashboardShell({ user, profile, children }: DashboardShellProps) {
  const displayName = profile.fullName?.trim() || user.email

  return (
    <Section padding="dashboard">
      <Container>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[28px] font-medium text-ink">
              My dashboard
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              Welcome back, {displayName}. Keep your momentum going.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="plan">Member</Badge>
            <SignOutButton />
          </div>
        </header>
        {children}
      </Container>
    </Section>
  )
}
