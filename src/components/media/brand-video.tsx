"use client"

import { cn } from "@/lib/utils"

type BrandVideoProps = {
  src: string
  title: string
  poster?: string
  className?: string
  containerClassName?: string
}

export function BrandVideo({
  src,
  title,
  poster,
  className,
  containerClassName,
}: BrandVideoProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-line bg-ink shadow-sm",
        containerClassName
      )}
    >
      <video
        className={cn("aspect-video w-full bg-ink object-cover", className)}
        controls
        playsInline
        preload="metadata"
        poster={poster}
        aria-label={title}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support embedded video playback.
      </video>
    </div>
  )
}
