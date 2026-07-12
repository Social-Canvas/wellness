"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { useState } from "react"

import { Container } from "@/components/layout/container"
import { Logo } from "@/components/layout/logo"
import { NavbarSignOutButton } from "@/components/layout/navbar-sign-out-button"
import { Badge, Button } from "@/components/ui"
import {
  DASHBOARD_NAV_ITEMS,
  type DashboardNavItem,
} from "@/features/dashboard/constants/navigation"
import type { UserRole } from "@/features/auth/types"
import { PUBLIC_LOGO } from "@/lib/constants/public-site"
import { cn } from "@/lib/utils"

type DashboardHeaderProps = {
  displayName: string
  email: string
  role: UserRole
  planBadge: string | null
  isAdmin: boolean
}

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard"
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

function getVisibleNavItems(isAdmin: boolean): DashboardNavItem[] {
  return DASHBOARD_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)
}

function DashboardNavLink({
  item,
  pathname,
  onNavigate,
  className,
}: {
  item: DashboardNavItem
  pathname: string
  onNavigate?: () => void
  className?: string
}) {
  const isActive = isNavItemActive(pathname, item.href)

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "font-body text-[14.5px] font-semibold transition-colors",
        isActive ? "text-blue" : "text-ink-soft hover:text-blue",
        className
      )}
    >
      {item.label}
    </Link>
  )
}

export function DashboardHeader({
  displayName,
  email,
  role,
  planBadge,
  isAdmin,
}: DashboardHeaderProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navItems = getVisibleNavItems(isAdmin)

  const badgeLabel =
    planBadge ?? (role === "super_admin" ? "Super admin" : role === "admin" ? "Admin" : "Member")

  function closeMobileNav() {
    setMobileOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[rgba(246,250,249,0.96)] backdrop-blur-[10px]">
      <Container>
        <div className="flex h-[66px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="min-[861px]:hidden"
              onClick={() => setMobileOpen((open) => !open)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {mobileOpen ? <X /> : <Menu />}
            </Button>

            <Link href="/" className="inline-flex shrink-0 transition-opacity hover:opacity-90">
              <Logo
                accent={PUBLIC_LOGO.accent}
                suffix={PUBLIC_LOGO.suffix}
                src={PUBLIC_LOGO.src}
                alt={PUBLIC_LOGO.alt}
              />
            </Link>
          </div>

          <nav
            aria-label="Dashboard"
            className="hidden min-[861px]:flex items-center gap-[22px]"
          >
            {navItems.map((item) => (
              <DashboardNavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2.5">
            <div className="hidden text-right min-[861px]:block">
              <p className="max-w-[180px] truncate text-sm font-semibold text-ink">
                {displayName}
              </p>
              <p className="max-w-[180px] truncate text-xs text-ink-soft">{email}</p>
            </div>
            <Badge variant="plan">{badgeLabel}</Badge>
            <NavbarSignOutButton />
          </div>
        </div>
      </Container>

      {mobileOpen ? (
        <div className="border-t border-line bg-surface min-[861px]:hidden">
          <Container className="py-4">
            <div className="mb-4 min-[861px]:hidden">
              <p className="text-sm font-semibold text-ink">{displayName}</p>
              <p className="text-xs text-ink-soft">{email}</p>
            </div>
            <nav aria-label="Dashboard mobile" className="flex flex-col gap-3">
              {navItems.map((item) => (
                <DashboardNavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={closeMobileNav}
                />
              ))}
            </nav>
          </Container>
        </div>
      ) : null}
    </header>
  )
}
