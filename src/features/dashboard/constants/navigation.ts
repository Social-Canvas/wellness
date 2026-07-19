export type DashboardNavItem = {
  label: string
  href: string
  adminOnly?: boolean
}

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "My Library", href: "/dashboard/library" },
  { label: "Downloads", href: "/dashboard/downloads" },
  { label: "Programs", href: "/programs" },
  { label: "Shop", href: "/shop" },
  { label: "Certificates", href: "/dashboard/certificates" },
  { label: "Account", href: "/dashboard/account" },
  { label: "Admin", href: "/admin", adminOnly: true },
]

export const DASHBOARD_FOOTER_LINKS = [
  { label: "Programs", href: "/programs" },
  { label: "Shop", href: "/shop" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
] as const
