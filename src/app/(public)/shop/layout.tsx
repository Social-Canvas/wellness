import type { Metadata } from "next"
import type { ReactNode } from "react"

import { Container } from "@/components/layout"
import { Section } from "@/components/layout/section"

export const metadata: Metadata = {
  title: "Shop",
  description: "Ebooks and digital downloads.",
}

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <main>
      <Section padding="default">
        <Container>{children}</Container>
      </Section>
    </main>
  )
}
