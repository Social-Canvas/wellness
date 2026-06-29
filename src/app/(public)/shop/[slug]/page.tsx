import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { ProductDetailView } from "@/features/shop/components"
import { getShopCatalogProductDetail } from "@/features/shop/services/shop.service"

interface ProductPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ checkout?: string }>
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const result = await getShopCatalogProductDetail(slug)

  if (!result.success) {
    return { title: "Product" }
  }

  return {
    title: result.data.title,
    description: result.data.description ?? undefined,
  }
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const profileResult = await getCurrentProfile()
  const { slug } = await params
  const { checkout } = await searchParams

  const result = await getShopCatalogProductDetail(
    slug,
    profileResult.success ? profileResult.data.id : null
  )

  if (!result.success) {
    notFound()
  }

  const checkoutMessage =
    checkout === "success"
      ? "Payment received. Your download will be ready once Stripe confirms the order."
      : checkout === "canceled"
        ? "Checkout canceled. You can try again whenever you are ready."
        : null

  return <ProductDetailView product={result.data} checkoutMessage={checkoutMessage} />
}
