import type { Metadata } from "next"
import Link from "next/link"

import { BrandImage } from "@/components/media"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { ShopProductGrid } from "@/features/shop/components"
import { listShopCatalogProducts } from "@/features/shop/services/shop.service"
import {
  ELEVATE_BRAND,
  ELEVATE_SHOP_COPY,
} from "@/lib/constants/elevate-brand"
import { BRAND_IMAGES } from "@/lib/brand/images"

export const metadata: Metadata = {
  title: `Shop — ${ELEVATE_BRAND.name}`,
  description: ELEVATE_SHOP_COPY.description,
}

export default async function ShopPage() {
  const profileResult = await getCurrentProfile()
  const userId = profileResult.success ? profileResult.data.id : null
  const result = await listShopCatalogProducts(userId)

  return (
    <div className="space-y-10">
      <div className="grid items-center gap-8 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm min-[861px]:grid-cols-[1.1fr_0.9fr]">
        <div className="p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue">Shop</p>
          <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-ink">
            {ELEVATE_SHOP_COPY.headline}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-soft">
            {ELEVATE_SHOP_COPY.description} For memberships and the breathwork journey, visit{" "}
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
        <ShopProductGrid
          products={result.data}
          isAuthenticated={Boolean(userId)}
        />
      ) : (
        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{result.error.message}</p>
        </div>
      )}
    </div>
  )
}
