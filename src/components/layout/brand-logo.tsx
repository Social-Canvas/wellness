import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { cva, type VariantProps } from "class-variance-authority"

import {
  BRAND_LOGO_HOME_LABEL,
  BRAND_LOGO_LOCKUP_HEIGHTS,
  BRAND_LOGO_MARK,
  BRAND_LOGO_MARK_HEIGHTS,
  getBrandLogoImageAlt,
  getBrandLogoLockup,
  type BrandLogoLockupTone,
  type BrandLogoSizeToken,
  type BrandLogoVariant,
} from "@/lib/brand/logo"
import { cn } from "@/lib/utils"

const brandLogoVariants = cva("inline-flex min-w-0 shrink-0 items-center", {
  variants: {
    appearance: {
      /** Dark-text lockup — light backgrounds (navbar, headers). */
      default: "",
      /** White-text lockup — dark footer surfaces. */
      footer: "",
      /** White-text lockup — dark / inverse surfaces. */
      inverse: "",
    },
  },
  defaultVariants: {
    appearance: "default",
  },
})

type BrandLogoSize = BrandLogoSizeToken

type BrandLogoProps = Omit<React.ComponentProps<"div">, "children"> &
  VariantProps<typeof brandLogoVariants> & {
    variant?: BrandLogoVariant
    size?: BrandLogoSize
    /** When set, wraps the lockup in a home link with an accessible name. */
    href?: string
    priority?: boolean
    /**
     * Show the square mark below this breakpoint; full lockup at/above it.
     * Only applies to the horizontal variant.
     */
    hideWordmarkBelow?: "sm" | "md"
  }

function appearanceToTone(
  appearance: BrandLogoProps["appearance"]
): BrandLogoLockupTone {
  return appearance === "footer" || appearance === "inverse"
    ? "white-text"
    : "dark-text"
}

function markDimensions(size: BrandLogoSize): { width: number; height: number } {
  const height = BRAND_LOGO_MARK_HEIGHTS[size]
  const width = Math.round(height * (BRAND_LOGO_MARK.width / BRAND_LOGO_MARK.height))
  return { width, height }
}

function lockupDimensions(size: BrandLogoSize): {
  width: number
  height: number
} {
  const lockup = getBrandLogoLockup("dark-text")
  const height = BRAND_LOGO_LOCKUP_HEIGHTS[size]
  const width = Math.round(height * (lockup.width / lockup.height))
  return { width, height }
}

function BrandLogoImage({
  src,
  alt,
  width,
  height,
  priority,
  className,
}: {
  src: string
  alt: string
  width: number
  height: number
  priority?: boolean
  className?: string
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn("shrink-0 object-contain", className)}
      style={{ width, height }}
      priority={priority}
    />
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
  const linked = Boolean(href)
  // Linked lockups use the link's aria-label once; images stay decorative.
  const imageAlt = linked ? "" : getBrandLogoImageAlt(variant)
  const tone = appearanceToTone(appearance)
  const lockup = getBrandLogoLockup(tone)
  const markSize = markDimensions(size)
  const lockupSize = lockupDimensions(size)

  const markVisibility =
    variant === "horizontal" && hideWordmarkBelow === "sm"
      ? "sm:hidden"
      : variant === "horizontal" && hideWordmarkBelow === "md"
        ? "md:hidden"
        : undefined

  const lockupVisibility =
    variant === "horizontal" && hideWordmarkBelow === "sm"
      ? "hidden sm:block"
      : variant === "horizontal" && hideWordmarkBelow === "md"
        ? "hidden md:block"
        : undefined

  const showMark = variant === "icon" || Boolean(hideWordmarkBelow)
  const showLockup = variant === "horizontal"

  const content = (
    <div
      data-slot="brand-logo"
      data-variant={variant}
      data-tone={tone}
      className={cn(brandLogoVariants({ appearance }), className)}
      {...props}
    >
      {showMark ? (
        <BrandLogoImage
          src={BRAND_LOGO_MARK.src}
          alt={imageAlt}
          width={markSize.width}
          height={markSize.height}
          priority={priority}
          className={markVisibility}
        />
      ) : null}
      {showLockup ? (
        <BrandLogoImage
          src={lockup.src}
          alt={imageAlt}
          width={lockupSize.width}
          height={lockupSize.height}
          priority={priority}
          className={lockupVisibility}
        />
      ) : null}
    </div>
  )

  if (!href) {
    return content
  }

  return (
    <Link
      href={href}
      aria-label={BRAND_LOGO_HOME_LABEL}
      className="inline-flex min-w-0 transition-opacity hover:opacity-90"
    >
      {content}
    </Link>
  )
}

export { BrandLogo, brandLogoVariants, type BrandLogoProps, type BrandLogoSize }
