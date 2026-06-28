import Link from "next/link"

import { Badge, Card, CardContent } from "@/components/ui"
import type { ShopProduct } from "@/features/shop/types"
import { formatProductPrice, formatProductType } from "@/features/shop/utils/format-product"
import { cn } from "@/lib/utils"

interface ShopProductCardProps {
  product: ShopProduct
  className?: string
}

export function ShopProductCard({ product, className }: ShopProductCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <Link href={`/shop/${product.slug}`} className="block">
        <div
          className={cn(
            "aspect-[4/3] bg-gradient-to-br from-blue-soft to-green-soft",
            product.coverImageUrl && "bg-cover bg-center"
          )}
          style={
            product.coverImageUrl
              ? { backgroundImage: `url(${product.coverImageUrl})` }
              : undefined
          }
        />
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-medium text-ink">{product.title}</h2>
              <p className="mt-1 text-sm text-ink-soft">
                {formatProductType(product.productType)}
              </p>
            </div>
            <Badge variant="plan">
              {formatProductPrice(product.priceAmount, product.currency)}
            </Badge>
          </div>
          {product.description ? (
            <p className="line-clamp-3 text-sm leading-relaxed text-ink-soft">
              {product.description}
            </p>
          ) : null}
        </CardContent>
      </Link>
    </Card>
  )
}
