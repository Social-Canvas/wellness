import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { BackButton } from "@/components/layout"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { ProductDetailView } from "@/features/shop/components"
import { getShopCatalogProductDetail } from "@/features/shop/services/shop.service"

interface ProductPageProps {
  params: Promise<{ slug: string }>
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

export default async function ProductPage({ params }: ProductPageProps) {
  const profileResult = await getCurrentProfile()
  const { slug } = await params

  const result = await getShopCatalogProductDetail(
    slug,
    profileResult.success ? profileResult.data.id : null
  )

  if (!result.success) {
    notFound()
  }

  return (
    <>
      <div className="mb-4">
        <BackButton fallbackHref="/shop" label="← Back to shop" />
      </div>
      <ProductDetailView
        product={result.data}
        isAuthenticated={profileResult.success}
      />
    </>
  )
}
