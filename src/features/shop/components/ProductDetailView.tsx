import Link from "next/link"

import { Badge, Card, CardContent } from "@/components/ui"
import { BrandImage } from "@/components/media"
import { ProductPreviewActions } from "@/features/shop/components/ProductPreviewActions"
import type { ShopProductDetail } from "@/features/shop/types"
import { formatProductPrice, formatProductType } from "@/features/shop/utils/format-product"
import {
  INTEGRATION_JOURNAL_TAGLINE,
  resolveFreeClaimCta,
} from "@/features/shop/utils/free-claim"
import { ELEVATE_SHOP_COPY } from "@/lib/constants/elevate-brand"
import { getProgramOfferBrandImage, resolveProductCoverImage } from "@/lib/brand/images"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

import { BuyProductButton } from "./BuyProductButton"
import { ClaimFreeProductButton } from "./ClaimFreeProductButton"
import { DownloadProductButton } from "./DownloadProductButton"

interface ProductDetailViewProps {
  product: ShopProductDetail
  isAuthenticated?: boolean
}

function formatFileSize(sizeBytes: number | null): string | null {
  if (sizeBytes == null || sizeBytes <= 0) {
    return null
  }

  const mb = sizeBytes / (1024 * 1024)
  if (mb >= 1) {
    return `${mb.toFixed(1)} MB`
  }

  const kb = sizeBytes / 1024
  return `${Math.max(1, Math.round(kb))} KB`
}

export function ProductDetailView({
  product,
  isAuthenticated = false,
}: ProductDetailViewProps) {
  const coverImage = resolveProductCoverImage(product.slug, product.coverImageUrl)
  const previewImage = getProgramOfferBrandImage(product.slug)
  const brandedCopy = ELEVATE_SHOP_COPY.products[product.slug as keyof typeof ELEVATE_SHOP_COPY.products]
  const title = brandedCopy?.title ?? product.title
  const description = brandedCopy?.description ?? product.description
  const isFreeClaim = product.purchaseMode === "free_claim"
  const freeCta = resolveFreeClaimCta({
    isAuthenticated,
    isClaimed: product.isPurchased,
    purchaseMode: product.purchaseMode,
    productSlug: product.slug,
  })

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <div className="relative aspect-video overflow-hidden rounded-[var(--radius-card)] border border-line shadow-sm">
          {coverImage ? (
            <BrandImage
              image={{ ...coverImage, alt: coverImage.alt || title }}
              containerClassName="absolute inset-0"
              sizes="(max-width: 1024px) 100vw, 65vw"
            />
          ) : null}
          <ProductPreviewActions title={title} image={previewImage} />
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{formatProductType(product.productType)}</Badge>
            {isFreeClaim && product.isPurchased ? (
              <Badge variant="plan">Added to your downloads</Badge>
            ) : null}
            {!isFreeClaim && product.isPurchased ? (
              <Badge variant="plan">Purchased</Badge>
            ) : null}
            {isFreeClaim && !product.isPurchased ? (
              <Badge variant="plan">Free</Badge>
            ) : null}
          </div>
          <h1 className="font-display text-4xl font-medium tracking-tight text-ink">
            {title}
          </h1>
          {isFreeClaim ? (
            <p className="text-base font-medium text-blue">{INTEGRATION_JOURNAL_TAGLINE}</p>
          ) : null}
          {description ? (
            <p className="max-w-2xl text-base leading-relaxed text-ink-soft">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <Card className="h-fit shadow-sm">
        <CardContent className="space-y-5 p-6">
          {!product.isPurchased ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Price
              </p>
              <p className="mt-1 font-display text-3xl font-medium text-ink">
                {isFreeClaim
                  ? "Free"
                  : formatProductPrice(product.priceAmount, product.currency)}
              </p>
            </div>
          ) : null}

          {product.isPurchased ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-soft">
                {isFreeClaim
                  ? "Your free journal is ready. Download it below or open Downloads."
                  : "Your purchase is ready. Download your ebook below."}
              </p>
              {product.files.length > 0 ? (
                product.files.map((file) => (
                  <div key={file.id} className="space-y-1">
                    <DownloadProductButton
                      productId={product.id}
                      fileId={file.id}
                      fileName={file.fileName}
                      label={isFreeClaim ? "Download journal" : "Download ebook"}
                    />
                    {formatFileSize(file.sizeBytes) ? (
                      <p className="text-xs text-ink-soft">
                        {formatFileSize(file.sizeBytes)}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-ink-soft">
                  Download files are being prepared for this product.
                </p>
              )}
              <Link
                href={freeCta.href}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                View in Downloads
              </Link>
            </div>
          ) : isFreeClaim ? (
            freeCta.action === "login" ? (
              <Link
                href={freeCta.href}
                className={cn(buttonVariants({ variant: "default" }))}
              >
                {freeCta.primaryLabel}
              </Link>
            ) : (
              <ClaimFreeProductButton
                productSlug={product.slug}
                label={freeCta.primaryLabel}
              />
            )
          ) : (
            <BuyProductButton
              productSlug={product.slug}
              label={
                product.productType === "ebook"
                  ? isAuthenticated
                    ? "Buy ebook"
                    : "Get the ebook"
                  : isAuthenticated
                    ? "Buy now"
                    : "Get it"
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
