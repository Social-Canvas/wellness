import Image from "next/image"

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
  if (fill) {
    return (
      <div className={cn("relative overflow-hidden", containerClassName)}>
        <Image
          src={image.src}
          alt={image.alt}
          fill
          priority={priority}
          sizes={sizes}
          className={cn("object-cover", className)}
          style={image.objectPosition ? { objectPosition: image.objectPosition } : undefined}
        />
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
      style={image.objectPosition ? { objectPosition: image.objectPosition } : undefined}
    />
  )
}

export { BrandImage, type BrandImageProps }
