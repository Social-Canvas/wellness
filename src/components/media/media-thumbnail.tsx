"use client"

import Image from "next/image"
import { useState } from "react"

import {
  resolveMediaThumbnail,
  type MediaThumbnailInput,
} from "@/lib/media/resolve-media-thumbnail"
import { cn } from "@/lib/utils"

type MediaThumbnailProps = {
  media: MediaThumbnailInput
  alt: string
  title?: string
  className?: string
  containerClassName?: string
  priority?: boolean
  sizes?: string
}

/**
 * Shared media card thumbnail with Mux-aware resolution and polished CSS fallback.
 * Never renders a broken <img> — load errors switch to the branded fallback.
 */
function MediaThumbnail({
  media,
  alt,
  title,
  className,
  containerClassName,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
}: MediaThumbnailProps) {
  const resolved = resolveMediaThumbnail(media)
  const [failed, setFailed] = useState(false)
  const showImage = resolved.kind === "url" && !failed

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-cream via-blue-soft/40 to-green/20",
        containerClassName
      )}
    >
      {showImage ? (
        <Image
          src={resolved.src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className={cn("object-cover", className)}
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center"
          role="img"
          aria-label={alt}
        >
          <div className="h-12 w-12 rounded-full border border-blue/25 bg-surface/70 shadow-sm" />
          <p className="font-display text-sm font-medium text-ink/80 line-clamp-2">
            {title?.trim() || alt}
          </p>
          <p className="text-[11px] uppercase tracking-[0.14em] text-ink-soft">
            Elevate Health
          </p>
        </div>
      )}
    </div>
  )
}

export { MediaThumbnail, type MediaThumbnailProps }
