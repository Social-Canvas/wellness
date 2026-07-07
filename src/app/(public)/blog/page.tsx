import type { Metadata } from "next"
import Link from "next/link"

import { Container, Section, SectionHeader } from "@/components/layout"
import { BrandImage } from "@/components/media"
import { getBlogArticleBrandImage } from "@/lib/brand/images"
import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"
import { SAMPLE_BLOG_ARTICLES } from "@/content/blog/sample-articles"

export const metadata: Metadata = {
  title: `Insights — ${ELEVATE_BRAND.name}`,
  description:
    "Evidence-informed articles on nervous system regulation, functional medicine, hormones, and root-cause healing.",
}

export default function BlogPage() {
  return (
    <main>
      <Section padding="default">
        <Container>
          <SectionHeader
            align="center"
            eyebrow="Elevate insights"
            title="Science + soul, explained"
            subtitle="Practical writing on energy, hormones, gut health, stress, and nervous system regulation — from the Elevate team."
          />

          <div className="mt-10 grid grid-cols-1 gap-5 min-[861px]:grid-cols-3">
            {SAMPLE_BLOG_ARTICLES.map((article) => (
              <article
                key={article.slug}
                className="overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-sm"
              >
                <Link href={`/blog/${article.slug}`} className="block">
                  <BrandImage
                    image={getBlogArticleBrandImage(article.slug)}
                    containerClassName="aspect-video w-full"
                    sizes="(max-width: 860px) 100vw, 33vw"
                  />
                  <div className="p-5">
                    <p className="text-[11px] font-bold tracking-[0.07em] text-blue uppercase">
                      {article.category}
                    </p>
                    <h2 className="mt-1 font-display text-[17px] font-medium text-ink">
                      {article.title}
                    </h2>
                    <p className="mt-1.5 text-[13.5px] text-ink-soft">{article.excerpt}</p>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </Container>
      </Section>
    </main>
  )
}
