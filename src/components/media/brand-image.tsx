"use client"

import Image from "next/image"
import { useState } from "react"

import type { BrandImageAsset } from "@/lib/brand/images"
import { cn } from "@/lib/utils"

type BrandImageProps = {
  image: BrandImageAsset | { src: string; alt: string; objectPosition?: string }
  className?: string
  containerClassName?: string
  priority?: boolean
  sizes?: string
  fill?: boolean
  width?: number
  height?: number
}

function BrandImageFallback({
  alt,
  className,
}: {
  alt: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-cream via-blue-soft/40 to-green/20 px-4 text-center",
        className
      )}
      role="img"
      aria-label={alt}
    >
      <div className="h-10 w-10 rounded-full border border-blue/25 bg-surface/70 shadow-sm" />
      <p className="text-[11px] uppercase tracking-[0.14em] text-ink-soft">
        Elevate Health
      </p>
    </div>
  )
}

function BrandImage({
  image,
  className,
  containerClassName,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
  fill = true,
  width,
  height,
}: BrandImageProps) {
  const [failed, setFailed] = useState(false)

  if (fill) {
    return (
      <div className={cn("relative overflow-hidden", containerClassName)}>
        {failed ? (
          <BrandImageFallback alt={image.alt} />
        ) : (
          <Image
            src={image.src}
            alt={image.alt}
            fill
            priority={priority}
            sizes={sizes}
            className={cn("object-cover", className)}
            style={
              image.objectPosition
                ? { objectPosition: image.objectPosition }
                : undefined
            }
            onError={() => setFailed(true)}
          />
        )}
      </div>
    )
  }

  if (failed) {
    return (
      <div className={cn("relative aspect-[3/2] w-full overflow-hidden", className)}>
        <BrandImageFallback alt={image.alt} />
      </div>
    )
  }

  return (
    <Image
      src={image.src}
      alt={image.alt}
      width={width ?? 1200}
      height={height ?? 800}
      priority={priority}
      sizes={sizes}
      className={cn("h-auto w-full object-cover", className)}
      style={
        image.objectPosition ? { objectPosition: image.objectPosition } : undefined
      }
      onError={() => setFailed(true)}
    />
  )
}

export { BrandImage, type BrandImageProps }
