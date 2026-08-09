import type { Metadata } from "next"

import { BlogArticleGrid } from "@/components/marketing/blog-article-grid"
import { Container, Section, SectionHeader } from "@/components/layout"
import { getAllBlogArticles } from "@/content/blog"
import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"

export const metadata: Metadata = {
  title: `Insights | ${ELEVATE_BRAND.name}`,
  description:
    "Evidence-informed articles on nervous system regulation, functional medicine, breathwork, and root-cause healing.",
  alternates: { canonical: "/blog" },
}

export default function BlogPage() {
  const articles = getAllBlogArticles()

  return (
    <main>
      <Section padding="default">
        <Container>
          <SectionHeader
            align="center"
            eyebrow="Elevate insights"
            title="Science + soul, explained"
            subtitle="Practical writing on breathwork, functional medicine, energy healing, and nervous system regulation from Dr. Deepa Pattani and the Elevate team."
          />

          <div className="mt-10">
            <BlogArticleGrid articles={articles} />
          </div>
        </Container>
      </Section>
    </main>
  )
}
