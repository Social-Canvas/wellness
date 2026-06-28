"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

interface AdminNavItemProps {
  href: string
  label: string
  onNavigate?: () => void
}

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin"
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminNavItem({ href, label, onNavigate }: AdminNavItemProps) {
  const pathname = usePathname()
  const active = isActivePath(pathname, href)

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "block rounded-[var(--radius-input)] px-3 py-2.5 text-sm font-semibold transition-colors",
        active
          ? "bg-blue-soft text-blue-deep"
          : "text-ink-soft hover:bg-cream2 hover:text-ink"
      )}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  )
}
