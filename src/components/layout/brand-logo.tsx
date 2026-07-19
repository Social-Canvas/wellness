import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { cva, type VariantProps } from "class-variance-authority"

import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"
import {
  BRAND_LOGO_HOME_LABEL,
  BRAND_LOGO_MARK,
  getBrandLogoImageAlt,
  type BrandLogoVariant,
} from "@/lib/brand/logo"
import { cn } from "@/lib/utils"

const brandLogoVariants = cva(
  "inline-flex min-w-0 shrink-0 items-center gap-2.5",
  {
    variants: {
      appearance: {
        default: "text-ink [&_[data-brand-accent]]:text-blue",
        footer: "text-[#C2D2D0] [&_[data-brand-accent]]:text-[#9FD0C9]",
        inverse: "text-cream [&_[data-brand-accent]]:text-blue-soft",
      },
    },
    defaultVariants: {
      appearance: "default",
    },
  }
)

const MARK_SIZES = {
  sm: 32,
  md: 36,
  lg: 48,
} as const

type BrandLogoSize = keyof typeof MARK_SIZES

type BrandLogoProps = Omit<React.ComponentProps<"div">, "children"> &
  VariantProps<typeof brandLogoVariants> & {
    variant?: BrandLogoVariant
    size?: BrandLogoSize
    /** When set, wraps the lockup in a home link with an accessible name. */
    href?: string
    priority?: boolean
    /**
     * Hide the wordmark below this breakpoint (icon-only on narrow viewports).
     * Only applies to the horizontal variant.
     */
    hideWordmarkBelow?: "sm" | "md"
  }

function markDimensions(size: BrandLogoSize): { width: number; height: number } {
  const height = MARK_SIZES[size]
  const width = Math.round(height * (BRAND_LOGO_MARK.width / BRAND_LOGO_MARK.height))
  return { width, height }
}

function BrandWordmark({
  className,
  decorative,
}: {
  className?: string
  /** Hide from AT when a parent link already names the brand. */
  decorative?: boolean
}) {
  return (
    <span
      aria-hidden={decorative ? true : undefined}
      className={cn("font-display font-semibold tracking-tight", className)}
    >
      {/* Single-line where space allows; two-line on narrow widths */}
      <span className="hidden whitespace-nowrap min-[420px]:inline">
        <span data-brand-accent>{ELEVATE_BRAND.shortName}</span>
        <span> Health Solutions</span>
      </span>
      <span className="inline leading-[1.15] min-[420px]:hidden">
        <span data-brand-accent className="block">
          {ELEVATE_BRAND.shortName}
        </span>
        <span className="block text-[0.82em] font-semibold">Health Solutions</span>
      </span>
    </span>
  )
}

function BrandLogo({
  className,
  appearance,
  variant = "horizontal",
  size = "md",
  href,
  priority = false,
  hideWordmarkBelow,
  ...props
}: BrandLogoProps) {
  const { width, height } = markDimensions(size)
  const linked = Boolean(href)
  // Linked lockups use the link's aria-label once; mark stays decorative.
  const imageAlt = linked ? "" : getBrandLogoImageAlt(variant)
  const showWordmark = variant === "horizontal"

  const wordmarkVisibility =
    hideWordmarkBelow === "sm"
      ? "max-sm:hidden"
      : hideWordmarkBelow === "md"
        ? "max-md:hidden"
        : undefined

  const lockup = (
    <div
      data-slot="brand-logo"
      data-variant={variant}
      className={cn(brandLogoVariants({ appearance }), className)}
      {...props}
    >
      <Image
        src={BRAND_LOGO_MARK.src}
        alt={imageAlt}
        width={width}
        height={height}
        className="shrink-0"
        style={{ width, height }}
        priority={priority}
      />
      {showWordmark ? (
        <BrandWordmark
          decorative={linked}
          className={cn(
            size === "sm" && "text-base",
            size === "md" && "text-lg",
            size === "lg" && "text-xl",
            wordmarkVisibility
          )}
        />
      ) : null}
    </div>
  )

  if (!href) {
    return lockup
  }

  return (
    <Link
      href={href}
      aria-label={BRAND_LOGO_HOME_LABEL}
      className="inline-flex min-w-0 transition-opacity hover:opacity-90"
    >
      {lockup}
    </Link>
  )
}

export { BrandLogo, brandLogoVariants, type BrandLogoProps, type BrandLogoSize }
