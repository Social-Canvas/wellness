"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

interface AdminNavItemProps {
  href: string
  label: string
  badgeCount?: number
  onNavigate?: () => void
}

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin"
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminNavItem({
  href,
  label,
  badgeCount,
  onNavigate,
}: AdminNavItemProps) {
  const pathname = usePathname()
  const active = isActivePath(pathname, href)
  const showBadge = typeof badgeCount === "number" && badgeCount > 0

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center justify-between gap-2 rounded-[var(--radius-input)] px-3 py-2.5 text-sm font-semibold transition-colors",
        active
          ? "bg-blue-soft text-blue-deep"
          : "text-ink-soft hover:bg-cream2 hover:text-ink"
      )}
      aria-current={active ? "page" : undefined}
    >
      <span>{label}</span>
      {showBadge ? (
        <span
          className={cn(
            "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none",
            active ? "bg-blue text-white" : "bg-blue-soft text-blue-deep"
          )}
          aria-label={`${badgeCount} new enquiries`}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      ) : null}
    </Link>
  )
}
