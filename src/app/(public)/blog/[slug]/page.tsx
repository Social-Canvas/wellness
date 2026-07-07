import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { BackButton } from "@/components/layout"
import { Container, Section } from "@/components/layout"
import { buttonVariants } from "@/components/ui/button"
import {
  getSampleBlogArticle,
  SAMPLE_BLOG_ARTICLES,
} from "@/content/blog/sample-articles"
import { cn } from "@/lib/utils"

interface BlogArticlePageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return SAMPLE_BLOG_ARTICLES.map((article) => ({ slug: article.slug }))
}

export async function generateMetadata({
  params,
}: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const article = getSampleBlogArticle(slug)

  if (!article) {
    return { title: "Article" }
  }

  return {
    title: article.title,
    description: article.excerpt,
  }
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params
  const article = getSampleBlogArticle(slug)

  if (!article) {
    notFound()
  }

  return (
    <main>
      <Section padding="default">
        <Container size="prose">
          <div className="mb-4">
            <BackButton fallbackHref="/blog" label="← Back to blog" />
          </div>

          <article className="mx-auto max-w-[46.25rem]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue">
              {article.category}
            </p>
            <h1 className="mt-3.5 font-display text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-tight text-ink">
              {article.title}
            </h1>
            <p className="mt-3.5 mb-6 text-sm text-ink-soft">
              By {article.author} · {article.readTime}
            </p>

            <div
              aria-hidden
              className="mb-6 flex aspect-[16/8] min-h-[220px] items-center justify-center rounded-[14px] border border-line bg-gradient-to-br from-blue-soft to-green-soft text-sm italic text-ink-soft"
            >
              Article image
            </div>

            {article.content.map((block, index) => {
              if (block.type === "heading") {
                return (
                  <h2
                    key={`${block.text}-${index}`}
                    className="mt-7 mb-2.5 font-display text-2xl font-medium text-ink"
                  >
                    {block.text}
                  </h2>
                )
              }

              if (block.type === "cta") {
                return (
                  <div
                    key={`${block.title}-${index}`}
                    className="mt-6 rounded-[14px] bg-blue-soft px-6 py-6 text-center"
                  >
                    <h3 className="font-display text-xl font-medium text-ink">
                      {block.title}
                    </h3>
                    <p className="mt-2 text-ink-soft">{block.description}</p>
                    <Link
                      href={block.href}
                      className={cn(buttonVariants({ variant: "default" }), "mt-4")}
                    >
                      {block.label}
                    </Link>
                  </div>
                )
              }

              return (
                <p
                  key={`${block.text.slice(0, 24)}-${index}`}
                  className="mb-4 text-[17px] leading-[1.75] text-ink-soft"
                >
                  {block.text}
                </p>
              )
            })}
          </article>
        </Container>
      </Section>
    </main>
  )
}
