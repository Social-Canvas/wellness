import { Menu, X } from "lucide-react"

import { Button } from "@/components/ui"
import { SignOutButton } from "@/features/dashboard/components/sign-out-button"
import type { AuthSessionUser } from "@/features/auth/types"
import type { ProfileView } from "@/features/auth/services/auth.service"

interface AdminHeaderProps {
  user: AuthSessionUser
  profile: ProfileView
  mobileOpen: boolean
  onToggleMenu: () => void
}

export function AdminHeader({
  user,
  profile,
  mobileOpen,
  onToggleMenu,
}: AdminHeaderProps) {
  const displayName = profile.fullName?.trim() || user.email

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-line bg-surface px-4 py-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="lg:hidden"
          onClick={onToggleMenu}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {mobileOpen ? <X /> : <Menu />}
        </Button>
        <div>
          <h1 className="font-display text-xl font-medium text-ink">Admin</h1>
          <p className="text-sm text-ink-soft">Signed in as {displayName}</p>
        </div>
      </div>

      <SignOutButton />
    </header>
  )
}
