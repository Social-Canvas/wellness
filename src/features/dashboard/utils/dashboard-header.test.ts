import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import {
  getEssentialNavItems,
  getMobileNavItems,
  getMoreNavItems,
  getSecondaryNavItems,
  getUserInitials,
  getUserMenuLinks,
  getUserMenuTriggerLabel,
  getWideNavItems,
  isNavItemActive,
  resolveMembershipLabel,
} from "../constants/navigation.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..")

function readSource(relative: string): string {
  return readFileSync(join(root, relative), "utf8")
}

test("brand lockup renders once in the dashboard header", () => {
  const header = readSource(
    "src/features/dashboard/components/dashboard-header.tsx"
  )
  const matches = header.match(/<BrandLogo[\s\S]*?\/>/g) ?? []
  assert.equal(matches.length, 1)
})

test("My Library renders once in essential desktop nav sources", () => {
  const essentials = getEssentialNavItems(false)
  assert.equal(
    essentials.filter((item) => item.href === "/dashboard/library").length,
    1
  )
})

test("signed-in email does not render directly in the desktop header row", () => {
  const header = readSource(
    "src/features/dashboard/components/dashboard-header.tsx"
  )
  const rowBlock = header.slice(
    header.indexOf("data-dashboard-header-row"),
    header.indexOf("data-dashboard-mobile-nav")
  )
  assert.doesNotMatch(rowBlock, /data-user-menu-email|data-mobile-menu-email/)
  assert.doesNotMatch(rowBlock, />\s*\{email\}\s*</)
  assert.match(rowBlock, /DashboardUserMenu/)
})

test("email appears inside the user dropdown", () => {
  const menu = readSource(
    "src/features/dashboard/components/dashboard-user-menu.tsx"
  )
  assert.match(menu, /data-user-menu-email/)
  assert.match(menu, /\{email\}/)
})

test("email is not duplicated across desktop header surfaces", () => {
  const header = readSource(
    "src/features/dashboard/components/dashboard-header.tsx"
  )
  const shell = readSource(
    "src/features/dashboard/components/dashboard-shell.tsx"
  )
  const menu = readSource(
    "src/features/dashboard/components/dashboard-user-menu.tsx"
  )
  assert.doesNotMatch(
    shell,
    /fullName=\{profile\.fullName\?\.trim\(\) \|\| user\.email\}/
  )
  assert.equal((menu.match(/data-user-menu-email/g) ?? []).length, 1)
  assert.equal((header.match(/data-mobile-menu-email/g) ?? []).length, 1)
  assert.doesNotMatch(header, /NavbarSignOutButton/)
  assert.doesNotMatch(header, /Badge variant="plan"/)
})

test("membership status appears in the user menu", () => {
  const menu = readSource(
    "src/features/dashboard/components/dashboard-user-menu.tsx"
  )
  assert.match(menu, /data-user-menu-membership/)
  assert.match(menu, /membershipLabel/)
  assert.equal(resolveMembershipLabel("Gold", "member"), "Gold")
  assert.equal(resolveMembershipLabel(null, "member"), "Member")
  assert.equal(resolveMembershipLabel(null, "admin"), "Admin")
})

test("Log out remains available", () => {
  const menu = readSource(
    "src/features/dashboard/components/dashboard-user-menu.tsx"
  )
  const header = readSource(
    "src/features/dashboard/components/dashboard-header.tsx"
  )
  assert.match(menu, /Log out/)
  assert.match(menu, /signOutAction/)
  assert.match(header, /Log out/)
  assert.match(header, /signOutAction/)
})

test("essential dashboard links remain accessible", () => {
  const essentials = getEssentialNavItems(false).map((item) => item.href)
  assert.deepEqual(essentials, [
    "/dashboard/library",
    "/dashboard/downloads",
    "/dashboard/certificates",
    "/dashboard/account",
  ])
})

test("Programs and Shop remain accessible", () => {
  const secondary = getSecondaryNavItems(false).map((item) => item.label)
  assert.deepEqual(secondary, ["Programs", "Shop"])
  const more = getMoreNavItems(false).map((item) => item.label)
  assert.ok(more.includes("Programs"))
  assert.ok(more.includes("Shop"))
  const mobile = getMobileNavItems(false).map((item) => item.label)
  assert.ok(mobile.includes("Programs"))
  assert.ok(mobile.includes("Shop"))
})

test("medium-width layout uses More/collapsed navigation", () => {
  const header = readSource(
    "src/features/dashboard/components/dashboard-header.tsx"
  )
  const more = readSource(
    "src/features/dashboard/components/dashboard-more-menu.tsx"
  )
  assert.match(header, /DashboardMoreMenu/)
  assert.match(header, /className="xl:hidden"/)
  assert.match(header, /hidden xl:inline/)
  assert.match(more, /More/)
  const moreItems = getMoreNavItems(false).map((item) => item.href)
  assert.ok(moreItems.includes("/programs"))
  assert.ok(moreItems.includes("/shop"))
  assert.ok(moreItems.includes("/dashboard/recorded-sessions"))
})

test("mobile menu contains all destinations", () => {
  const mobile = getMobileNavItems(true).map((item) => item.label)
  for (const label of [
    "My Library",
    "Recorded Sessions",
    "Downloads",
    "Programs",
    "Shop",
    "Certificates",
    "Account",
    "Admin",
  ]) {
    assert.ok(mobile.includes(label), `missing ${label}`)
  }

  const header = readSource(
    "src/features/dashboard/components/dashboard-header.tsx"
  )
  assert.match(header, /data-mobile-menu-email/)
  assert.match(header, /data-mobile-menu-membership/)
  assert.match(header, /Log out/)
})

test("selecting a mobile link closes the menu", () => {
  const header = readSource(
    "src/features/dashboard/components/dashboard-header.tsx"
  )
  assert.match(header, /onNavigate=\{closeMobileNav\}/)
  assert.match(header, /setMobileOpen\(false\)/)
})

test("Escape closes dropdowns", () => {
  const menu = readSource(
    "src/features/dashboard/components/dashboard-user-menu.tsx"
  )
  const more = readSource(
    "src/features/dashboard/components/dashboard-more-menu.tsx"
  )
  const header = readSource(
    "src/features/dashboard/components/dashboard-header.tsx"
  )
  assert.match(menu, /Escape/)
  assert.match(more, /Escape/)
  assert.match(header, /Escape/)
})

test("focus returns to the trigger", () => {
  const menu = readSource(
    "src/features/dashboard/components/dashboard-user-menu.tsx"
  )
  const more = readSource(
    "src/features/dashboard/components/dashboard-more-menu.tsx"
  )
  const header = readSource(
    "src/features/dashboard/components/dashboard-header.tsx"
  )
  assert.match(menu, /triggerRef\.current\?\.focus\(\)/)
  assert.match(more, /triggerRef\.current\?\.focus\(\)/)
  assert.match(header, /mobileTriggerRef\.current\?\.focus\(\)/)
})

test("long email does not cause overflow in the header trigger", () => {
  assert.equal(getUserMenuTriggerLabel(null), "Account")
  assert.equal(getUserMenuTriggerLabel("Ada Lovelace"), "Ada")
  assert.equal(
    getUserInitials(null, "verylongemailaddress@example.com"),
    "VE"
  )

  const menu = readSource(
    "src/features/dashboard/components/dashboard-user-menu.tsx"
  )
  assert.match(menu, /max-w-\[11rem\]/)
  assert.match(menu, /truncate/)
  assert.match(menu, /break-words/)
  assert.doesNotMatch(menu, /triggerLabel\}.*email/)
})

test("active-route state remains correct", () => {
  assert.equal(isNavItemActive("/dashboard", "/dashboard"), true)
  assert.equal(isNavItemActive("/dashboard/library", "/dashboard"), false)
  assert.equal(
    isNavItemActive("/dashboard/library/course-1", "/dashboard/library"),
    true
  )
  assert.equal(isNavItemActive("/programs", "/shop"), false)

  const header = readSource(
    "src/features/dashboard/components/dashboard-header.tsx"
  )
  assert.match(header, /aria-current=\{isActive \? "page" : undefined\}/)
  assert.match(header, /underline/)
})

test("signed-out public header is unaffected", () => {
  const publicNavbar = readSource("src/components/layout/public-navbar.tsx")
  const navbar = readSource("src/components/layout/navbar.tsx")
  assert.match(publicNavbar, /PublicNavbar/)
  assert.match(navbar, /sticky top-0/)
  assert.doesNotMatch(publicNavbar, /DashboardUserMenu|DashboardMoreMenu/)
  assert.doesNotMatch(navbar, /DashboardUserMenu|getMoreNavItems/)
})

test("no authorization or membership logic changes in header helpers", () => {
  const navigation = readSource(
    "src/features/dashboard/constants/navigation.ts"
  )
  const shell = readSource(
    "src/features/dashboard/components/dashboard-shell.tsx"
  )
  assert.doesNotMatch(navigation, /entitlement|stripe|subscription\.status/)
  assert.match(shell, /activeSubscription\?\.planName/)
  assert.match(shell, /subscription\.status === "active"/)

  const wide = getWideNavItems(false).map((item) => item.href)
  assert.deepEqual(wide, ["/dashboard/recorded-sessions"])

  const userLinks = getUserMenuLinks(false).map((item) => item.href)
  assert.ok(userLinks.includes("/dashboard"))
  assert.ok(userLinks.includes("/dashboard/library"))
  assert.ok(userLinks.includes("/dashboard/account"))
  assert.ok(!userLinks.includes("/admin"))
  assert.ok(getUserMenuLinks(true).some((item) => item.href === "/admin"))
})
