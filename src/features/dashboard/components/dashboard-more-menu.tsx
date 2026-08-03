"use client"

import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"

import {
  isNavItemActive,
  type DashboardNavItem,
} from "@/features/dashboard/constants/navigation"
import { cn } from "@/lib/utils"

type DashboardMoreMenuProps = {
  items: DashboardNavItem[]
  pathname: string
  className?: string
}

export function DashboardMoreMenu({
  items,
  pathname,
  className,
}: DashboardMoreMenuProps) {
  const menuId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  if (items.length === 0) {
    return null
  }

  const hasActiveChild = items.some((item) =>
    isNavItemActive(pathname, item.href)
  )

  return (
    <div
      ref={containerRef}
      data-dashboard-more-menu
      className={cn("relative flex-none", className)}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap font-body text-[14.5px] font-semibold transition-colors",
          hasActiveChild || open
            ? "text-blue underline decoration-blue/40 underline-offset-4"
            : "text-ink-soft hover:text-blue"
        )}
        onClick={() => setOpen((current) => !current)}
      >
        More
        <ChevronDown
          aria-hidden
          className={cn(
            "size-3.5 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="More navigation"
          className="absolute left-0 z-50 mt-2 min-w-[12rem] rounded-2xl border border-line bg-surface p-2 shadow-lg"
        >
          {items.map((item) => {
            const isActive = isNavItemActive(pathname, item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                aria-current={isActive ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-xl px-3 py-2 font-body text-sm font-semibold transition-colors hover:bg-cream2",
                  isActive
                    ? "bg-blue-soft text-blue underline decoration-blue/40 underline-offset-4"
                    : "text-ink hover:text-blue"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
