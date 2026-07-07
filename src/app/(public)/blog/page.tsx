import type { Metadata } from "next"
import Link from "next/link"

import { Container, Section, SectionHeader } from "@/components/layout"
import { SAMPLE_BLOG_ARTICLES } from "@/content/blog/sample-articles"

export const metadata: Metadata = {
  title: "Blog",
  description: "Wellness, explained — practical articles on energy, hormones, gut health, and stress.",
}

export default function BlogPage() {
  return (
    <main>
      <Section padding="default">
        <Container>
          <SectionHeader
            align="center"
            eyebrow="The blog"
            title="Wellness, explained"
            subtitle="Deep, practical articles on energy, hormones, gut health, stress, and healing at the root."
          />

          <div className="mt-10 grid grid-cols-1 gap-5 min-[861px]:grid-cols-3">
            {SAMPLE_BLOG_ARTICLES.map((article) => (
              <article
                key={article.slug}
                className="overflow-hidden rounded-2xl border border-line bg-surface text-left"
              >
                <Link href={`/blog/${article.slug}`} className="block">
                  <div className="aspect-video bg-gradient-to-br from-blue-soft to-green-soft" />
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
