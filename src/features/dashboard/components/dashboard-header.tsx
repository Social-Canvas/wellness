"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react"

import { BrandLogo } from "@/components/layout/brand-logo"
import { signOutAction } from "@/features/auth/actions/auth.actions"
import type { UserRole } from "@/features/auth/types"
import { DashboardMoreMenu } from "@/features/dashboard/components/dashboard-more-menu"
import { DashboardUserMenu } from "@/features/dashboard/components/dashboard-user-menu"
import {
  getEssentialNavItems,
  getMobileNavItems,
  getMoreNavItems,
  getSecondaryNavItems,
  getWideNavItems,
  isNavItemActive,
  resolveMembershipLabel,
  type DashboardNavItem,
} from "@/features/dashboard/constants/navigation"
import { cn } from "@/lib/utils"

type DashboardHeaderProps = {
  fullName: string | null
  email: string
  role: UserRole
  planBadge: string | null
  isAdmin: boolean
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
        "whitespace-nowrap font-body text-[14.5px] font-semibold transition-colors",
        isActive
          ? "text-blue underline decoration-blue/40 underline-offset-4"
          : "text-ink-soft hover:text-blue",
        className
      )}
    >
      {item.label}
    </Link>
  )
}

export function DashboardHeader({
  fullName,
  email,
  role,
  planBadge,
  isAdmin,
}: DashboardHeaderProps) {
  const pathname = usePathname()
  const mobilePanelId = useId()
  const mobileTriggerRef = useRef<HTMLButtonElement>(null)
  const mobilePanelRef = useRef<HTMLDivElement>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const essentialItems = getEssentialNavItems(isAdmin)
  const wideItems = getWideNavItems(isAdmin)
  const secondaryItems = getSecondaryNavItems(isAdmin)
  const moreItems = getMoreNavItems(isAdmin)
  const mobileItems = getMobileNavItems(isAdmin)
  const membershipLabel = resolveMembershipLabel(planBadge, role)

  useEffect(() => {
    if (!mobileOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false)
        mobileTriggerRef.current?.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    const firstFocusable = mobilePanelRef.current?.querySelector<HTMLElement>(
      "a[href], button:not([disabled])"
    )
    firstFocusable?.focus()

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [mobileOpen])

  function closeMobileNav() {
    setMobileOpen(false)
    queueMicrotask(() => {
      mobileTriggerRef.current?.focus()
    })
  }

  function handleMobileSignOut() {
    closeMobileNav()
    startTransition(async () => {
      await signOutAction()
    })
  }

  return (
    <header
      data-dashboard-header
      className="sticky top-0 z-40 border-b border-line bg-[rgba(246,250,249,0.96)] backdrop-blur-[10px]"
    >
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div
          data-dashboard-header-row
          className="flex h-[66px] flex-nowrap items-center gap-3 md:gap-4"
        >
          <div
            data-dashboard-brand
            className="flex min-w-0 flex-none items-center gap-2"
          >
            <button
              ref={mobileTriggerRef}
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-full border-[1.5px] border-line bg-transparent text-ink transition-colors hover:border-ink md:hidden focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-expanded={mobileOpen}
              aria-controls={mobilePanelId}
              aria-label={
                mobileOpen ? "Close navigation menu" : "Open navigation menu"
              }
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>

            <BrandLogo
              variant="horizontal"
              size="md"
              href="/"
              hideWordmarkBelow="sm"
              priority
              className="flex-none whitespace-nowrap"
            />
          </div>

          <nav
            aria-label="Dashboard"
            data-dashboard-desktop-nav
            className="hidden min-w-0 flex-1 items-center justify-center gap-x-5 md:flex lg:gap-x-6"
          >
            <div className="flex min-w-0 flex-nowrap items-center gap-x-5 lg:gap-x-6">
              {essentialItems.map((item) => (
                <DashboardNavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                />
              ))}

              {wideItems.map((item) => (
                <DashboardNavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  className="hidden xl:inline"
                />
              ))}

              {secondaryItems.map((item) => (
                <DashboardNavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  className="hidden xl:inline"
                />
              ))}

              <DashboardMoreMenu
                items={moreItems}
                pathname={pathname}
                className="xl:hidden"
              />
            </div>
          </nav>

          <DashboardUserMenu
            fullName={fullName}
            email={email}
            membershipLabel={membershipLabel}
            isAdmin={isAdmin}
            className="ml-auto hidden md:block"
          />
        </div>
      </div>

      {mobileOpen ? (
        <div
          id={mobilePanelId}
          ref={mobilePanelRef}
          data-dashboard-mobile-nav
          className="border-t border-line bg-surface md:hidden"
        >
          <div className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6">
            <div className="mb-4 border-b border-line pb-4">
              <p
                data-mobile-menu-email
                className="break-words text-sm font-semibold text-ink"
              >
                {email}
              </p>
              <p
                data-mobile-menu-membership
                className="mt-1 text-xs font-semibold text-ink-soft"
              >
                {membershipLabel}
              </p>
            </div>

            <nav aria-label="Dashboard mobile" className="flex flex-col gap-1">
              {mobileItems.map((item) => (
                <DashboardNavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={closeMobileNav}
                  className="rounded-xl px-3 py-2.5 hover:bg-cream2"
                />
              ))}
            </nav>

            <div className="mt-4 border-t border-line pt-4">
              <button
                type="button"
                disabled={isPending}
                onClick={handleMobileSignOut}
                className="w-full rounded-xl border border-line px-3 py-2.5 text-left font-body text-sm font-semibold text-ink transition-colors hover:border-blue hover:text-blue disabled:opacity-60"
              >
                {isPending ? "Signing out…" : "Log out"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  )
}
