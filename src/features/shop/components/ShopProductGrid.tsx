import type { ShopProduct } from "@/features/shop/types"

import { ShopProductCard } from "./ShopProductCard"

interface ShopProductGridProps {
  products: ShopProduct[]
  isAuthenticated?: boolean
}

export function ShopProductGrid({
  products,
  isAuthenticated = false,
}: ShopProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-cream2/50 px-6 py-10 text-center">
        <p className="font-display text-lg font-medium text-ink">No products available</p>
        <p className="mt-2 text-sm text-ink-soft">
          Published ebooks and digital downloads will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ShopProductCard
          key={product.id}
          product={product}
          isAuthenticated={isAuthenticated}
        />
      ))}
    </div>
  )
}
