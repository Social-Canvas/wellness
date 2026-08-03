import type { ProductType } from "@/features/shop/types"
import { isPublicCatalogProduct } from "@/lib/constants/catalog-visibility"

export const SHOP_CATALOG_PRODUCT_TYPES = [
  "ebook",
  "digital_download",
] as const satisfies readonly ProductType[]

export const PROGRAM_CATALOG_PRODUCT_TYPES = [
  "masterclass",
  "session",
  "bundle",
] as const satisfies readonly ProductType[]

export function isShopCatalogProductType(productType: ProductType): boolean {
  return (SHOP_CATALOG_PRODUCT_TYPES as readonly ProductType[]).includes(productType)
}

export function isProgramCatalogProductType(productType: ProductType): boolean {
  return (PROGRAM_CATALOG_PRODUCT_TYPES as readonly ProductType[]).includes(productType)
}

export function isPurchasableCatalogProductType(productType: ProductType): boolean {
  return isShopCatalogProductType(productType) || isProgramCatalogProductType(productType)
}

/** Public shop/program listings — published and not explicitly hidden. */
export function isPublicListingProduct(product: {
  slug: string
  status: string
  productType: ProductType
}): boolean {
  if (!isPublicCatalogProduct(product)) {
    return false
  }

  return isPurchasableCatalogProductType(product.productType)
}
