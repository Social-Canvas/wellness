import { Logo } from "@/components/layout"
import { cn } from "@/lib/utils"

import { AdminNavItem } from "./AdminNavItem"

const ADMIN_NAV_ITEMS = [
  { label: "Dashboard", href: "/admin" },
  { label: "Plans", href: "/admin/plans" },
  { label: "Courses", href: "/admin/courses" },
  { label: "Products", href: "/admin/products" },
  { label: "Members", href: "/admin/members" },
  { label: "Certificates", href: "/admin/certificates" },
  { label: "Bookings", href: "/admin/bookings" },
  { label: "Leads", href: "/admin/leads" },
  { label: "Settings", href: "/admin/settings" },
] as const

interface AdminSidebarProps {
  mobileOpen: boolean
  onNavigate?: () => void
}

export function AdminSidebar({ mobileOpen, onNavigate }: AdminSidebarProps) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-ink/30 lg:hidden",
          mobileOpen ? "block" : "hidden"
        )}
        aria-hidden={!mobileOpen}
        onClick={onNavigate}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[17.5rem] flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Admin navigation"
      >
        <div className="mb-6 px-2">
          <Logo accent="Admin" suffix="Studio" />
          <p className="mt-1 text-xs text-ink-soft">Platform management</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {ADMIN_NAV_ITEMS.map((item) => (
            <AdminNavItem
              key={item.href}
              href={item.href}
              label={item.label}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      </aside>
    </>
  )
}
