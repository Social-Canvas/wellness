"use client"

import Link from "next/link"
import { Menu, X } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"

import type { NavbarLinkItem } from "@/components/layout/navbar-links"
import { cn } from "@/lib/utils"

type PublicMobileNavProps = {
  links: readonly NavbarLinkItem[]
}

function PublicMobileNav({ links }: PublicMobileNavProps) {
  const pathname = usePathname()
  const panelId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
      "a[href]"
    )
    firstFocusable?.focus()

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  function close() {
    setOpen(false)
    queueMicrotask(() => {
      triggerRef.current?.focus()
    })
  }

  return (
    <div className="min-[861px]:hidden">
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex size-8 items-center justify-center rounded-full border-[1.5px] border-line bg-transparent text-ink transition-colors hover:border-ink focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>

      {open ? (
        <div
          id={panelId}
          ref={panelRef}
          data-public-mobile-nav
          className="absolute inset-x-0 top-full z-50 border-b border-line bg-surface shadow-sm"
        >
          <nav
            aria-label="Main mobile"
            className="mx-auto flex w-full max-w-[1200px] flex-col gap-1 px-4 py-4 sm:px-6"
          >
            {links.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname === link.href ||
                    pathname.startsWith(`${link.href}/`)

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={close}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "rounded-xl px-3 py-2.5 font-body text-sm font-semibold transition-colors hover:bg-cream2",
                    isActive ? "text-blue" : "text-ink-soft hover:text-blue"
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>
      ) : null}
    </div>
  )
}

export { PublicMobileNav, type PublicMobileNavProps }
