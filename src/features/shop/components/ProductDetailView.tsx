import { Badge, Card, CardContent } from "@/components/ui"
import { ProductPreviewActions } from "@/features/shop/components/ProductPreviewActions"
import type { ShopProductDetail } from "@/features/shop/types"
import { formatProductPrice, formatProductType } from "@/features/shop/utils/format-product"
import { cn } from "@/lib/utils"

import { BuyProductButton } from "./BuyProductButton"
import { DownloadProductButton } from "./DownloadProductButton"

interface ProductDetailViewProps {
  product: ShopProductDetail
}

export function ProductDetailView({ product }: ProductDetailViewProps) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <div
          className={cn(
            "relative aspect-video overflow-hidden rounded-[var(--radius-card)] border border-line bg-gradient-to-br from-blue-soft to-green-soft",
            product.coverImageUrl && "bg-cover bg-center"
          )}
          style={
            product.coverImageUrl
              ? { backgroundImage: `url(${product.coverImageUrl})` }
              : undefined
          }
        >
          <ProductPreviewActions title={product.title} />
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{formatProductType(product.productType)}</Badge>
            {product.isPurchased ? <Badge variant="plan">Purchased</Badge> : null}
          </div>
          <h1 className="font-display text-4xl font-medium tracking-tight text-ink">
            {product.title}
          </h1>
          {product.description ? (
            <p className="max-w-2xl text-base leading-relaxed text-ink-soft">
              {product.description}
            </p>
          ) : null}
        </div>
      </div>

      <Card className="h-fit">
        <CardContent className="space-y-5 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Price</p>
            <p className="mt-1 font-display text-3xl font-medium text-ink">
              {formatProductPrice(product.priceAmount, product.currency)}
            </p>
          </div>

          {product.isPurchased ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-soft">
                Your purchase is ready. Download files below.
              </p>
              {product.files.length > 0 ? (
                product.files.map((file) => (
                  <DownloadProductButton
                    key={file.id}
                    productId={product.id}
                    fileId={file.id}
                    fileName={file.fileName}
                  />
                ))
              ) : (
                <p className="text-sm text-ink-soft">
                  Download files are being prepared for this product.
                </p>
              )}
            </div>
          ) : (
            <BuyProductButton productSlug={product.slug} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
