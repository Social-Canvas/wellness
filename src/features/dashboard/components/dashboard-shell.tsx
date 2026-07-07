import type { ReactNode } from "react"

import { Container, Section } from "@/components/layout"
import type { ProfileView } from "@/features/auth/services/auth.service"
import type { AuthSessionUser } from "@/features/auth/types"
import type { CurrentSubscription } from "@/features/billing/types"

import { DashboardFooter } from "./dashboard-footer"
import { DashboardHeader } from "./dashboard-header"

interface DashboardShellProps {
  user: AuthSessionUser
  profile: ProfileView
  subscription: CurrentSubscription | null
  children: ReactNode
}

export function DashboardShell({
  user,
  profile,
  subscription,
  children,
}: DashboardShellProps) {
  const displayName = profile.fullName?.trim() || user.email
  const isAdmin = user.role === "admin" || user.role === "super_admin"
  const activeSubscription =
    subscription &&
    (subscription.status === "active" ||
      subscription.status === "trialing" ||
      subscription.status === "past_due")
      ? subscription
      : null

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <DashboardHeader
        displayName={displayName}
        email={user.email}
        role={user.role}
        planBadge={activeSubscription?.planName ?? null}
        isAdmin={isAdmin}
      />

      <main className="flex-1">
        <Section padding="dashboard">
          <Container>{children}</Container>
        </Section>
      </main>

      <DashboardFooter />
    </div>
  )
}
