import type { Metadata } from "next"

import { listProducts } from "@/features/shop/services/products.service"
import { ProductsTable } from "@/features/shop/components"

export const metadata: Metadata = {
  title: "Products",
}

export default async function AdminProductsPage() {
  const result = await listProducts()

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-[28px] font-medium text-ink">Products</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Manage digital products for the shop.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{result.error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[28px] font-medium text-ink">Products</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Manage digital products, Stripe prices, and download file metadata.
        </p>
      </div>

      <ProductsTable products={result.data} />
    </div>
  )
}
