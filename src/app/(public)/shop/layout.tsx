import type { Metadata } from "next"
import type { ReactNode } from "react"

import { Container } from "@/components/layout"
import { Section } from "@/components/layout/section"
import { ELEVATE_SHOP_COPY } from "@/lib/constants/elevate-brand"
import { buildPublicPageMetadata } from "@/lib/seo/site-seo"

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Shop",
  description: ELEVATE_SHOP_COPY.description,
  path: "/shop",
})

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <main>
      <Section padding="default">
        <Container>{children}</Container>
      </Section>
    </main>
  )
}
