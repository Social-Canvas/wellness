import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import {
  getEssentialNavItems,
  getMobileNavItems,
} from "../../features/dashboard/constants/navigation.ts"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..")

function readSource(relative: string): string {
  return readFileSync(join(root, relative), "utf8")
}

const publicMobile = () =>
  readSource("src/components/layout/public-mobile-nav.tsx")
const publicNavbar = () =>
  readSource("src/components/layout/public-navbar.tsx")
const navbarLinks = () =>
  readSource("src/components/layout/navbar-links.tsx")
const dashboardHeader = () =>
  readSource("src/features/dashboard/components/dashboard-header.tsx")
const publicSite = () => readSource("src/lib/constants/public-site.ts")

test("1. Desktop shows horizontal navigation", () => {
  assert.match(navbarLinks(), /hidden[\s\S]*lg:flex/)
  assert.match(
    dashboardHeader(),
    /data-dashboard-desktop-nav[\s\S]*lg:flex/
  )
})

test("2. Mobile hides horizontal navigation", () => {
  assert.match(navbarLinks(), /hidden[\s\S]*lg:flex/)
  assert.doesNotMatch(navbarLinks(), /min-\[861px\]:flex/)
  assert.match(
    dashboardHeader(),
    /data-dashboard-desktop-nav[\s\S]*className="hidden/
  )
})

test("3. Mobile shows hamburger button", () => {
  assert.match(publicMobile(), /lg:hidden/)
  assert.match(publicMobile(), /Open navigation menu/)
  assert.match(publicMobile(), /<Menu/)
  assert.match(dashboardHeader(), /lg:hidden/)
  assert.match(dashboardHeader(), /Open navigation menu/)
  assert.match(dashboardHeader(), /<Menu/)
})

test("4. Hamburger opens menu", () => {
  assert.match(publicMobile(), /setOpen\(\(value\) => !value\)/)
  assert.match(publicMobile(), /data-public-mobile-nav/)
  assert.match(dashboardHeader(), /setMobileOpen\(\(open\) => !open\)/)
  assert.match(dashboardHeader(), /data-dashboard-mobile-nav/)
})

test("5. Close button closes menu", () => {
  assert.match(publicMobile(), /aria-label="Close navigation menu"/)
  assert.match(publicMobile(), /onClick=\{close\}/)
  assert.match(dashboardHeader(), /aria-label="Close navigation menu"/)
  assert.match(dashboardHeader(), /onClick=\{closeMobileNav\}/)
})

test("6. Escape closes menu", () => {
  assert.match(publicMobile(), /Escape/)
  assert.match(publicMobile(), /setOpen\(false\)/)
  assert.match(dashboardHeader(), /Escape/)
  assert.match(dashboardHeader(), /setMobileOpen\(false\)/)
})

test("7. Selecting a link closes menu", () => {
  assert.match(publicMobile(), /onClick=\{close\}/)
  assert.match(dashboardHeader(), /onNavigate=\{closeMobileNav\}/)
})

test("8. Public user sees public navigation", () => {
  const site = publicSite()
  for (const label of [
    "Home",
    "Programs",
    "Retreats",
    "For Nonprofits",
    "Shop",
    "Blog",
    "About",
  ]) {
    assert.match(site, new RegExp(`label: "${label}"`))
  }
  assert.match(publicNavbar(), /PUBLIC_NAV_LINKS/)
  assert.match(publicMobile(), /links\.map/)
  assert.match(publicMobile(), /Log in/)
  assert.match(publicMobile(), /Start Reset Plan/)
})

test("9. Authenticated user sees member navigation", () => {
  const mobile = getMobileNavItems(false).map((item) => item.label)
  for (const label of [
    "My Library",
    "Membership",
    "Downloads",
    "Certificates",
    "Account",
    "Programs",
    "Shop",
    "Blog",
    "About",
  ]) {
    assert.ok(mobile.includes(label), `missing ${label}`)
  }
  assert.match(publicMobile(), /isAuthenticated/)
  assert.match(publicMobile(), /Dashboard/)
  assert.match(publicMobile(), /\/dashboard\/account/)
  assert.match(publicMobile(), /NavbarSignOutButton/)
  assert.match(dashboardHeader(), /Log out/)
})

test("10. Logged-out user does not see private routes", () => {
  const source = publicMobile()
  const loggedOutStart = source.indexOf(") : (")
  assert.ok(loggedOutStart > 0)
  const loggedOutBlock = source.slice(loggedOutStart)
  assert.match(loggedOutBlock, /Log in/)
  assert.match(loggedOutBlock, /Start Reset Plan/)
  assert.doesNotMatch(loggedOutBlock, /\/dashboard\/library/)
  assert.doesNotMatch(loggedOutBlock, /\/dashboard\/membership/)
  assert.doesNotMatch(loggedOutBlock, /My Library/)
  assert.match(publicNavbar(), /getCurrentProfile/)
  assert.doesNotMatch(publicNavbar(), /fetch\(["']/)
})

test("11. Active route is indicated", () => {
  assert.match(publicMobile(), /aria-current=\{isActive \? "page" : undefined\}/)
  assert.match(publicMobile(), /isActive \? "text-blue"/)
  assert.match(
    dashboardHeader(),
    /aria-current=\{isActive \? "page" : undefined\}/
  )
})

test("12. Keyboard navigation works", () => {
  assert.match(publicMobile(), /aria-expanded=\{open\}/)
  assert.match(publicMobile(), /aria-controls=\{panelId\}/)
  assert.match(publicMobile(), /firstFocusable\?\.focus\(\)/)
  assert.match(publicMobile(), /triggerRef\.current\?\.focus\(\)/)
  assert.match(dashboardHeader(), /aria-expanded=\{mobileOpen\}/)
  assert.match(dashboardHeader(), /aria-controls=\{mobilePanelId\}/)
  assert.match(dashboardHeader(), /firstFocusable\?\.focus\(\)/)
  assert.match(dashboardHeader(), /mobileTriggerRef\.current\?\.focus\(\)/)
  assert.match(publicMobile(), /type="button"/)
  assert.match(dashboardHeader(), /type="button"/)
})

test("13. 320px viewport has no overflow", () => {
  assert.match(publicMobile(), /size-11/)
  assert.match(publicMobile(), /size-\[22px\]/)
  assert.match(dashboardHeader(), /size-11/)
  assert.match(dashboardHeader(), /size-\[22px\]/)
  assert.match(dashboardHeader(), /flex-nowrap/)
  assert.match(dashboardHeader(), /min-w-0/)
  assert.match(
    readSource("src/components/layout/navbar.tsx"),
    /justify-between gap-3\.5/
  )
  assert.match(publicNavbar(), /hideWordmarkBelow: "sm"/)
})

test("14. Existing desktop header remains unchanged", () => {
  const essentials = getEssentialNavItems(false).map((item) => item.href)
  assert.deepEqual(essentials, [
    "/dashboard/library",
    "/dashboard/membership",
    "/dashboard/downloads",
    "/dashboard/certificates",
    "/dashboard/account",
  ])
  assert.match(
    readSource("src/components/layout/navbar.tsx"),
    /sticky top-0 z-40 border-b border-line bg-\[rgba\(246,250,249,0\.96\)\] backdrop-blur-\[10px\]/
  )
  assert.doesNotMatch(
    readSource("src/components/layout/navbar.tsx"),
    /["']relative["']/
  )
  assert.match(publicNavbar(), /hidden items-center gap-2\.5 lg:flex/)
  assert.match(dashboardHeader(), /DashboardUserMenu/)
  assert.match(dashboardHeader(), /DashboardMoreMenu/)
  assert.match(dashboardHeader(), /className="ml-auto hidden lg:block"/)
  assert.match(publicMobile(), /document\.body\.style\.overflow = "hidden"/)
  assert.match(dashboardHeader(), /document\.body\.style\.overflow = "hidden"/)
  assert.match(publicMobile(), /mousedown/)
  assert.match(dashboardHeader(), /mousedown/)
})
