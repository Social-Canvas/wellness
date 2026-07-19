import { BrandImage } from "@/components/media"
import { Badge, Card, CardContent } from "@/components/ui"
import { DownloadProductButton } from "@/features/shop/components/DownloadProductButton"
import type { PurchasedDownloadItem } from "@/features/shop/types"
import { formatProductType } from "@/features/shop/utils/format-product"
import { ELEVATE_SHOP_COPY } from "@/lib/constants/elevate-brand"
import { resolveProductCoverImage } from "@/lib/brand/images"

interface DownloadsLibraryProps {
  items: PurchasedDownloadItem[]
}

function formatPurchaseDate(value: string | null): string | null {
  if (!value) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function formatFileSize(sizeBytes: number | null): string | null {
  if (sizeBytes == null || sizeBytes <= 0) {
    return null
  }

  const mb = sizeBytes / (1024 * 1024)
  if (mb >= 1) {
    return `${mb.toFixed(1)} MB`
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`
}

export function DownloadsLibrary({ items }: DownloadsLibraryProps) {
  if (items.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-dashed border-line bg-cream2/50">
        <div className="px-6 py-10 text-center">
          <p className="font-display text-lg font-medium text-ink">No downloads yet</p>
          <p className="mt-2 text-sm text-ink-soft">
            Purchased ebooks and digital downloads will appear here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const brandedCopy =
          ELEVATE_SHOP_COPY.products[
            item.productSlug as keyof typeof ELEVATE_SHOP_COPY.products
          ]
        const title = brandedCopy?.title ?? item.productTitle
        const coverImage = resolveProductCoverImage(
          item.productSlug,
          item.coverImageUrl
        )
        const purchasedLabel = formatPurchaseDate(item.purchasedAt)

        return (
          <Card key={item.productId} className="overflow-hidden shadow-sm">
            <CardContent className="grid gap-5 p-5 min-[700px]:grid-cols-[140px_minmax(0,1fr)]">
              <BrandImage
                image={{ ...coverImage, alt: coverImage.alt || title }}
                containerClassName="aspect-[4/3] w-full overflow-hidden rounded-xl"
                sizes="140px"
              />
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{formatProductType(item.productType)}</Badge>
                  <Badge variant="plan">Purchased</Badge>
                </div>
                <div>
                  <h2 className="font-display text-2xl font-medium text-ink">{title}</h2>
                  {purchasedLabel ? (
                    <p className="mt-1 text-sm text-ink-soft">
                      Purchased {purchasedLabel}
                    </p>
                  ) : null}
                </div>
                {item.files.length > 0 ? (
                  <div className="space-y-3">
                    {item.files.map((file) => (
                      <div key={file.id} className="space-y-1">
                        <p className="text-sm text-ink-soft">{file.fileName}</p>
                        {formatFileSize(file.sizeBytes) ? (
                          <p className="text-xs text-ink-soft">
                            {formatFileSize(file.sizeBytes)}
                          </p>
                        ) : null}
                        <DownloadProductButton
                          productId={item.productId}
                          fileId={file.id}
                          fileName={file.fileName}
                          label="Download ebook"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-soft">
                    Download files are being prepared for this product.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
