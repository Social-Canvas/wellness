import type { Database } from "@/types/database/supabase"

export type Product = Database["public"]["Tables"]["products"]["Row"]
export type ProductFile = Database["public"]["Tables"]["product_files"]["Row"]
export type ProductType = Product["product_type"]
export type PublishStatus = Product["status"]

export type ShopProduct = {
  id: string
  slug: string
  title: string
  description: string | null
  productType: ProductType
  priceAmount: number
  currency: string
  coverImageUrl: string | null
  isPurchased?: boolean
}

export type ShopProductDetail = ShopProduct & {
  isPurchased: boolean
  files: Array<{
    id: string
    fileName: string
    mimeType: string | null
    sizeBytes: number | null
  }>
}

export type PurchasedDownloadItem = {
  productId: string
  productSlug: string
  productTitle: string
  productType: ProductType
  coverImageUrl: string | null
  purchasedAt: string | null
  files: Array<{
    id: string
    fileName: string
    mimeType: string | null
    sizeBytes: number | null
  }>
}

export type ProductCheckoutResult = {
  sessionId: string | null
  url: string
  alreadyEntitled: boolean
}

export type ProductDownloadUrlResult = {
  url: string
  fileName: string
  expiresInSeconds: number
}
