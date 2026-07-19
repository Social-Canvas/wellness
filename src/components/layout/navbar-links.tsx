"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

type NavbarLinkItem = {
  label: string
  href: string
}

type NavbarLinksProps = {
  links: readonly NavbarLinkItem[]
}

function NavbarLinks({ links }: NavbarLinksProps) {
  const pathname = usePathname()

  return (
    <div className="hidden min-[861px]:flex items-center gap-[22px]">
      {links.map((link) => {
        const isActive =
          link.href === "/"
            ? pathname === "/"
            : pathname === link.href || pathname.startsWith(`${link.href}/`)

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "font-body text-[14.5px] font-semibold text-ink-soft transition-colors hover:text-blue",
              isActive && "text-blue"
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </div>
  )
}

export { NavbarLinks, type NavbarLinkItem }
