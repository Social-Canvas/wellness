import type { Metadata } from "next"
import type { ReactNode } from "react"

import { Navbar } from "@/components/layout"

export const metadata: Metadata = {
  title: "Shop",
  description: "Ebooks and digital downloads.",
}

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Programs", href: "/programs" },
  { label: "Shop", href: "/shop", active: true },
  { label: "Library", href: "/dashboard/library" },
] as const

const NAV_ACTIONS = [
  { label: "Log in", href: "/login", variant: "ghost" as const },
  { label: "Dashboard", href: "/dashboard", variant: "primary" as const },
]

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar
        logo={{ accent: "Wellness", suffix: "Studio", href: "/" }}
        links={[...NAV_LINKS]}
        actions={[...NAV_ACTIONS]}
      />
      <main className="bg-cream px-[26px] py-14">
        <div className="mx-auto w-full max-w-[1120px]">{children}</div>
      </main>
    </>
  )
}
