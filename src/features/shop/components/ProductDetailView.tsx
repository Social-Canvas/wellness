import { Badge, Card, CardContent } from "@/components/ui"
import { BrandImage } from "@/components/media"
import { ProductPreviewActions } from "@/features/shop/components/ProductPreviewActions"
import type { ShopProductDetail } from "@/features/shop/types"
import { formatProductPrice, formatProductType } from "@/features/shop/utils/format-product"
import { getProgramOfferBrandImage, resolveProductCoverImage } from "@/lib/brand/images"

import { BuyProductButton } from "./BuyProductButton"
import { DownloadProductButton } from "./DownloadProductButton"

interface ProductDetailViewProps {
  product: ShopProductDetail
}

export function ProductDetailView({ product }: ProductDetailViewProps) {
  const coverImage = resolveProductCoverImage(product.slug, product.coverImageUrl)
  const previewImage = getProgramOfferBrandImage(product.slug)

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <div className="relative aspect-video overflow-hidden rounded-[var(--radius-card)] border border-line shadow-sm">
          {coverImage ? (
            <BrandImage
              image={{ ...coverImage, alt: coverImage.alt || product.title }}
              containerClassName="absolute inset-0"
              sizes="(max-width: 1024px) 100vw, 65vw"
            />
          ) : null}
          <ProductPreviewActions title={product.title} image={previewImage} />
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

      <Card className="h-fit shadow-sm">
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
