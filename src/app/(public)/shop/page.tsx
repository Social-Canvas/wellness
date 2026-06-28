import type { Metadata } from "next"

import { ShopProductGrid } from "@/features/shop/components"
import { listPublishedProducts } from "@/features/shop/services/shop.service"

export const metadata: Metadata = {
  title: "Shop",
  description: "Books and digital resources you can buy and download instantly.",
}

export default async function ShopPage() {
  const result = await listPublishedProducts()

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue">Shop</p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-ink">
          Books &amp; resources
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-soft">
          Digital products you can buy and download instantly.
        </p>
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
