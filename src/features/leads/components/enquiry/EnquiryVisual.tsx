import { BrandImage } from "@/components/media"
import type { BrandImageAsset } from "@/lib/brand/images"
import { cn } from "@/lib/utils"

type EnquiryVisualProps = {
  image: BrandImageAsset
  className?: string
  priority?: boolean
}

function EnquiryVisual({ image, className, priority = true }: EnquiryVisualProps) {
  return (
    <BrandImage
      image={image}
      priority={priority}
      containerClassName={cn(
        "mb-6 aspect-[5/4] w-full overflow-hidden rounded-2xl border border-line shadow-sm",
        className
      )}
      sizes="(max-width: 899px) 100vw, 42vw"
    />
  )
}

export { EnquiryVisual, type EnquiryVisualProps }
