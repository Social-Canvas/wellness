import * as React from "react"

import { buttonVariants } from "@/components/ui/button"
import { Container } from "@/components/layout/container"
import { Logo } from "@/components/layout/logo"
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
  accent: string
  suffix?: string
  href?: string
}

type NavbarProps = React.ComponentProps<"header"> & {
  logo: NavbarLogo
  links?: NavbarLink[]
  socialLinks?: NavbarSocialLink[]
  actions?: NavbarAction[]
  back?: NavbarBackLink
}

function NavbarBackLink({ label, href }: NavbarBackLink) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1 rounded-[30px] border border-line bg-surface px-3.5 py-[7px] font-body text-[13.5px] font-bold text-ink-soft transition-colors hover:border-blue hover:text-blue"
    >
      {label}
    </a>
  )
}

function NavbarLinkItem({ label, href, active }: NavbarLink) {
  return (
    <a
      href={href}
      data-active={active ? "" : undefined}
      className={cn(
        "font-body text-[14.5px] font-semibold text-ink-soft transition-colors hover:text-blue",
        active && "text-blue"
      )}
    >
      {label}
    </a>
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
    <a href={href} className={cn(buttonVariants({ variant: buttonVariant, size: "sm" }))}>
      {label}
    </a>
  )
}

function NavbarLogoLink({ accent, suffix, href }: NavbarLogo) {
  const logo = <Logo accent={accent} suffix={suffix} />

  if (!href) {
    return logo
  }

  return (
    <a href={href} className="inline-flex transition-opacity hover:opacity-90">
      {logo}
    </a>
  )
}

function Navbar({
  className,
  logo,
  links = [],
  socialLinks = [],
  actions = [],
  back,
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
            <NavbarLogoLink {...logo} />
          </div>

          {links.length > 0 ? (
            <div className="hidden min-[861px]:flex items-center gap-[22px]">
              {links.map((link) => (
                <NavbarLinkItem key={`${link.href}-${link.label}`} {...link} />
              ))}
            </div>
          ) : null}

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

            {actions.map((action) => (
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
