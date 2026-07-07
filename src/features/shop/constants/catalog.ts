import type { ProductType } from "@/features/shop/types"

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
