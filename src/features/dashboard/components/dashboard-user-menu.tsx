"use client"

import Link from "next/link"
import { ChevronDown } from "lucide-react"
import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react"

import { signOutAction } from "@/features/auth/actions/auth.actions"
import {
  getUserInitials,
  getUserMenuLinks,
  getUserMenuTriggerLabel,
} from "@/features/dashboard/constants/navigation"
import { cn } from "@/lib/utils"

type DashboardUserMenuProps = {
  fullName: string | null
  email: string
  membershipLabel: string
  isAdmin: boolean
  className?: string
}

export function DashboardUserMenu({
  fullName,
  email,
  membershipLabel,
  isAdmin,
  className,
}: DashboardUserMenuProps) {
  const menuId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const triggerLabel = getUserMenuTriggerLabel(fullName)
  const initials = getUserInitials(fullName, email)
  const links = getUserMenuLinks(isAdmin)

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  function handleSignOut() {
    setOpen(false)
    startTransition(async () => {
      await signOutAction()
    })
  }

  return (
    <div
      ref={containerRef}
      data-dashboard-user-menu
      className={cn("relative flex-none", className)}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className="inline-flex max-w-[11rem] items-center gap-2 rounded-[var(--radius-button)] border border-line bg-surface px-2.5 py-1.5 font-body text-sm font-semibold text-ink transition-colors hover:border-blue hover:text-blue focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={() => setOpen((current) => !current)}
      >
        <span
          aria-hidden
          className="inline-flex size-7 flex-none items-center justify-center rounded-full bg-blue-soft text-[11px] font-bold text-blue"
        >
          {initials}
        </span>
        <span className="min-w-0 truncate">{triggerLabel}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-3.5 flex-none text-ink-soft transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-2 shadow-lg"
        >
          <div className="border-b border-line px-3 py-2.5">
            <p
              data-user-menu-email
              className="break-words text-sm font-semibold text-ink"
            >
              {email}
            </p>
            <p
              data-user-menu-membership
              className="mt-1 text-xs font-semibold text-ink-soft"
            >
              {membershipLabel}
            </p>
          </div>

          <div className="flex flex-col gap-0.5 py-1.5">
            {links.map((link) => (
              <MenuLink
                key={link.href}
                href={link.href}
                onNavigate={() => setOpen(false)}
              >
                {link.label}
              </MenuLink>
            ))}
          </div>

          <div className="border-t border-line pt-1.5">
            <button
              type="button"
              role="menuitem"
              disabled={isPending}
              onClick={handleSignOut}
              className="w-full rounded-xl px-3 py-2 text-left font-body text-sm font-semibold text-ink transition-colors hover:bg-cream2 disabled:opacity-60"
            >
              {isPending ? "Signing out…" : "Log out"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function MenuLink({
  href,
  onNavigate,
  children,
}: {
  href: string
  onNavigate: () => void
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="rounded-xl px-3 py-2 font-body text-sm font-semibold text-ink transition-colors hover:bg-cream2 hover:text-blue"
    >
      {children}
    </Link>
  )
}
