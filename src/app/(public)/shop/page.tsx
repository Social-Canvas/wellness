import type { Metadata } from "next"
import Link from "next/link"

import { BrandImage } from "@/components/media"
import { ShopProductGrid } from "@/features/shop/components"
import { listShopCatalogProducts } from "@/features/shop/services/shop.service"
import { BRAND_IMAGES } from "@/lib/brand/images"

export const metadata: Metadata = {
  title: "Shop",
  description: "Ebooks and digital downloads you can buy and access instantly.",
}

export default async function ShopPage() {
  const result = await listShopCatalogProducts()

  return (
    <div className="space-y-10">
      <div className="grid items-center gap-8 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm min-[861px]:grid-cols-[1.1fr_0.9fr]">
        <div className="p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue">Shop</p>
          <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-ink">
            Ebooks &amp; digital downloads
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-soft">
            Books and digital resources you can buy and download instantly. For memberships,
            programs, and live sessions, visit{" "}
            <Link href="/programs" className="font-semibold text-blue hover:text-blue-deep">
              Programs
            </Link>
            .
          </p>
        </div>
        <BrandImage
          image={BRAND_IMAGES.productCookbook}
          containerClassName="aspect-[16/11] w-full min-h-[240px]"
          sizes="(max-width: 860px) 100vw, 45vw"
        />
      </div>

      {result.success ? (
        <ShopProductGrid products={result.data} />
      ) : (
        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{result.error.message}</p>
        </div>
      )}
    </div>
  )
}
