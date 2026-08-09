"use client"

import Link from "next/link"
import { Menu, X } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"

import type { NavbarLinkItem } from "@/components/layout/navbar-links"
import { NavbarSignOutButton } from "@/components/layout/navbar-sign-out-button"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PublicMobileNavProps = {
  links: readonly NavbarLinkItem[]
  isAuthenticated: boolean
}

function PublicMobileNav({ links, isAuthenticated }: PublicMobileNavProps) {
  const pathname = usePathname()
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("mousedown", handlePointerDown)

    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
      "a[href], button:not([disabled])"
    )
    firstFocusable?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("mousedown", handlePointerDown)
    }
  }, [open])

  function close() {
    setOpen(false)
    queueMicrotask(() => {
      triggerRef.current?.focus()
    })
  }

  return (
    <div ref={rootRef} className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-[var(--radius-button)] text-ink transition-colors hover:bg-cream2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <X className="size-[22px]" aria-hidden />
        ) : (
          <Menu className="size-[22px]" aria-hidden />
        )}
      </button>

      {open ? (
        <>
          <div
            aria-hidden
            className="fixed inset-0 z-40 bg-ink/20"
            onClick={close}
          />
          <div
            id={panelId}
            ref={panelRef}
            data-public-mobile-nav
            className="absolute inset-x-0 top-full z-50 border-b border-line bg-surface shadow-sm"
          >
            <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
              <p className="font-body text-sm font-semibold text-ink">Menu</p>
              <button
                type="button"
                className="inline-flex size-11 items-center justify-center rounded-[var(--radius-button)] text-ink transition-colors hover:bg-cream2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label="Close navigation menu"
                onClick={close}
              >
                <X className="size-[22px]" aria-hidden />
              </button>
            </div>

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
                      "rounded-xl px-3 py-3 font-body text-sm font-semibold transition-colors hover:bg-cream2",
                      isActive ? "text-blue" : "text-ink-soft hover:text-blue"
                    )}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>

            <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2 border-t border-line px-4 py-4 sm:px-6">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={close}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "justify-center"
                    )}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/dashboard/account"
                    onClick={close}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "justify-center"
                    )}
                  >
                    Account
                  </Link>
                  <div onClick={close}>
                    <NavbarSignOutButton />
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={close}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "justify-center"
                    )}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/programs#reset-plan"
                    onClick={close}
                    className={cn(
                      buttonVariants({ variant: "default", size: "sm" }),
                      "justify-center"
                    )}
                  >
                    Start Reset Plan
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

export { PublicMobileNav, type PublicMobileNavProps }
