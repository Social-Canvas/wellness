import Link from "next/link"

import { Badge, Card, CardContent } from "@/components/ui"
import { BrandImage } from "@/components/media"
import type { ShopProduct } from "@/features/shop/types"
import { formatProductPrice, formatProductType } from "@/features/shop/utils/format-product"
import { resolveShopCatalogCta } from "@/features/shop/utils/ebook-delivery"
import { ELEVATE_SHOP_COPY } from "@/lib/constants/elevate-brand"
import { resolveProductCoverImage } from "@/lib/brand/images"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

interface ShopProductCardProps {
  product: ShopProduct
  isAuthenticated?: boolean
  className?: string
}

export function ShopProductCard({
  product,
  isAuthenticated = false,
  className,
}: ShopProductCardProps) {
  const coverImage = resolveProductCoverImage(product.slug, product.coverImageUrl)
  const brandedCopy = ELEVATE_SHOP_COPY.products[product.slug as keyof typeof ELEVATE_SHOP_COPY.products]
  const description = brandedCopy?.description ?? product.description
  const title = brandedCopy?.title ?? product.title
  const isPurchased = Boolean(product.isPurchased)
  const cta = resolveShopCatalogCta({
    productType: product.productType,
    isAuthenticated,
    isPurchased,
    productSlug: product.slug,
  })

  return (
    <Card className={cn("overflow-hidden shadow-sm", className)}>
      <Link href={`/shop/${product.slug}`} className="block">
        <BrandImage
          image={{ ...coverImage, alt: coverImage.alt || product.title }}
          containerClassName="aspect-[4/3] w-full"
          sizes="(max-width: 860px) 100vw, 33vw"
        />
      </Link>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href={`/shop/${product.slug}`} className="hover:text-blue">
              <h2 className="font-display text-xl font-medium text-ink">{title}</h2>
            </Link>
            <p className="mt-1 text-sm text-ink-soft">
              {formatProductType(product.productType)}
            </p>
          </div>
          {cta.showPrice ? (
            <Badge variant="plan">
              {formatProductPrice(product.priceAmount, product.currency)}
            </Badge>
          ) : (
            <Badge variant="plan">Purchased</Badge>
          )}
        </div>
        {description ? (
          <p className="line-clamp-3 text-sm leading-relaxed text-ink-soft">
            {description}
          </p>
        ) : null}
        <Link
          href={isPurchased ? cta.href : `/shop/${product.slug}`}
          className={cn(buttonVariants({ variant: isPurchased ? "outline" : "default", size: "sm" }))}
        >
          {cta.primaryLabel}
        </Link>
      </CardContent>
    </Card>
  )
}
