export type DashboardNavGroup = "essential" | "wide" | "secondary" | "utility"

export type DashboardNavItem = {
  label: string
  href: string
  group: DashboardNavGroup
  adminOnly?: boolean
}

/**
 * Authenticated dashboard destinations.
 * - essential: always visible from md+
 * - wide: inline from xl+; otherwise under More / mobile drawer
 * - secondary: Programs/Shop — inline from xl+; More from md–xl
 * - utility: user menu / mobile drawer (Dashboard home, Admin)
 */
export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { label: "My Library", href: "/dashboard/library", group: "essential" },
  {
    label: "Live Sessions",
    href: "/dashboard/live-sessions",
    group: "wide",
  },
  {
    label: "Recorded Sessions",
    href: "/dashboard/recorded-sessions",
    group: "wide",
  },
  { label: "Downloads", href: "/dashboard/downloads", group: "essential" },
  { label: "Certificates", href: "/dashboard/certificates", group: "essential" },
  { label: "Account", href: "/dashboard/account", group: "essential" },
  { label: "Programs", href: "/programs", group: "secondary" },
  { label: "Shop", href: "/shop", group: "secondary" },
  { label: "Dashboard", href: "/dashboard", group: "utility" },
  { label: "Admin", href: "/admin", group: "utility", adminOnly: true },
]

export const DASHBOARD_FOOTER_LINKS = [
  { label: "Programs", href: "/programs" },
  { label: "Shop", href: "/shop" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
] as const

export function filterVisibleNavItems(
  items: DashboardNavItem[],
  isAdmin: boolean
): DashboardNavItem[] {
  return items.filter((item) => !item.adminOnly || isAdmin)
}

export function getEssentialNavItems(isAdmin: boolean): DashboardNavItem[] {
  return filterVisibleNavItems(
    DASHBOARD_NAV_ITEMS.filter((item) => item.group === "essential"),
    isAdmin
  )
}

export function getWideNavItems(isAdmin: boolean): DashboardNavItem[] {
  return filterVisibleNavItems(
    DASHBOARD_NAV_ITEMS.filter((item) => item.group === "wide"),
    isAdmin
  )
}

export function getSecondaryNavItems(isAdmin: boolean): DashboardNavItem[] {
  return filterVisibleNavItems(
    DASHBOARD_NAV_ITEMS.filter((item) => item.group === "secondary"),
    isAdmin
  )
}

/** Items collapsed into the medium-width More menu. */
export function getMoreNavItems(isAdmin: boolean): DashboardNavItem[] {
  return filterVisibleNavItems(
    DASHBOARD_NAV_ITEMS.filter(
      (item) =>
        item.group === "wide" ||
        item.group === "secondary" ||
        (item.group === "utility" && item.adminOnly)
    ),
    isAdmin
  )
}

/** Full destination list for the mobile drawer. */
export function getMobileNavItems(isAdmin: boolean): DashboardNavItem[] {
  return filterVisibleNavItems(
    DASHBOARD_NAV_ITEMS.filter(
      (item) =>
        item.group === "essential" ||
        item.group === "wide" ||
        item.group === "secondary" ||
        (item.group === "utility" && item.adminOnly)
    ),
    isAdmin
  )
}

export function getUserMenuLinks(isAdmin: boolean): DashboardNavItem[] {
  const links: DashboardNavItem[] = [
    { label: "Account", href: "/dashboard/account", group: "utility" },
    { label: "Dashboard", href: "/dashboard", group: "utility" },
    { label: "My Library", href: "/dashboard/library", group: "utility" },
  ]

  if (isAdmin) {
    links.push({
      label: "Admin",
      href: "/admin",
      group: "utility",
      adminOnly: true,
    })
  }

  return links
}

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard"
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Compact header trigger label — never the email. */
export function getUserMenuTriggerLabel(fullName: string | null): string {
  const trimmed = fullName?.trim()
  if (!trimmed) {
    return "Account"
  }

  return trimmed.split(/\s+/)[0] ?? "Account"
}

export function getUserInitials(
  fullName: string | null,
  email: string
): string {
  const trimmed = fullName?.trim()
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase()
    }
    return trimmed.slice(0, 2).toUpperCase()
  }

  const local = email.split("@")[0] ?? email
  return local.slice(0, 2).toUpperCase()
}

export function resolveMembershipLabel(
  planBadge: string | null,
  role: string
): string {
  if (planBadge) {
    return planBadge
  }

  if (role === "super_admin") {
    return "Super admin"
  }

  if (role === "admin") {
    return "Admin"
  }

  return "Member"
}
