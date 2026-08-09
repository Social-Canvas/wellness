import * as React from "react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { BrandLogo } from "@/components/layout/brand-logo"
import { cn } from "@/lib/utils"

type NavbarLink = {
  label: string
  href: string
  active?: boolean
}

type NavbarSocialLink = {
  label: string
  href: string
}

type NavbarAction = {
  label: string
  href: string
  variant?: "primary" | "ghost"
}

type NavbarBackLink = {
  label: string
  href: string
}

type NavbarLogo = {
  href?: string
  /** Hide wordmark on very narrow headers; mark remains. */
  hideWordmarkBelow?: "sm" | "md"
}

type NavbarProps = React.ComponentProps<"header"> & {
  logo: NavbarLogo
  links?: NavbarLink[]
  socialLinks?: NavbarSocialLink[]
  actions?: NavbarAction[]
  back?: NavbarBackLink
  navMiddle?: React.ReactNode
  navActions?: React.ReactNode
}

function NavbarBackLink({ label, href }: NavbarBackLink) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-[30px] border border-line bg-surface px-3.5 py-[7px] font-body text-[13.5px] font-bold text-ink-soft transition-colors hover:border-blue hover:text-blue"
    >
      {label}
    </Link>
  )
}

function NavbarLinkItem({ label, href, active }: NavbarLink) {
  return (
    <Link
      href={href}
      data-active={active ? "" : undefined}
      className={cn(
        "font-body text-[14.5px] font-semibold text-ink-soft transition-colors hover:text-blue",
        active && "text-blue"
      )}
    >
      {label}
    </Link>
  )
}

function NavbarSocialLinkItem({ label, href }: NavbarSocialLink) {
  return (
    <a
      href={href}
      className="font-body text-[13px] font-semibold text-ink-soft transition-colors hover:text-blue"
    >
      {label}
    </a>
  )
}

function NavbarActionLink({ label, href, variant = "ghost" }: NavbarAction) {
  const buttonVariant = variant === "primary" ? "default" : "outline"

  return (
    <Link href={href} className={cn(buttonVariants({ variant: buttonVariant, size: "sm" }))}>
      {label}
    </Link>
  )
}

function Navbar({
  className,
  logo,
  links = [],
  socialLinks = [],
  actions = [],
  back,
  navMiddle,
  navActions,
  ...props
}: NavbarProps) {
  return (
    <header
      data-slot="navbar"
      className={cn(
        "sticky top-0 z-40 border-b border-line bg-[rgba(246,250,249,0.96)] backdrop-blur-[10px]",
        className
      )}
      {...props}
    >
      <Container>
        <nav
          aria-label="Main"
          className="flex h-[66px] items-center justify-between gap-3.5"
        >
          <div className="flex min-w-0 items-center gap-3.5">
            {back ? <NavbarBackLink {...back} /> : null}
            <BrandLogo
              variant="horizontal"
              size="md"
              href={logo.href}
              hideWordmarkBelow={logo.hideWordmarkBelow}
              priority
            />
          </div>

          {navMiddle ??
            (links.length > 0 ? (
              <div className="hidden min-w-0 items-center gap-[22px] min-[861px]:flex">
                {links.map((link) => (
                  <NavbarLinkItem key={`${link.href}-${link.label}`} {...link} />
                ))}
              </div>
            ) : null)}

          <div className="flex shrink-0 items-center gap-2.5">
            {socialLinks.length > 0 ? (
              <div className="hidden min-[861px]:flex items-center gap-3">
                {socialLinks.map((link) => (
                  <NavbarSocialLinkItem
                    key={`${link.href}-${link.label}`}
                    {...link}
                  />
                ))}
              </div>
            ) : null}

            {navActions ??
              actions.map((action) => (
                <NavbarActionLink
                  key={`${action.href}-${action.label}`}
                  {...action}
                />
              ))}
          </div>
        </nav>
      </Container>
    </header>
  )
}

export type {
  NavbarAction,
  NavbarBackLink,
  NavbarLink,
  NavbarLogo,
  NavbarProps,
  NavbarSocialLink,
}
export { Navbar }
