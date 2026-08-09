import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { BackButton } from "@/components/layout"
import { Container, Section } from "@/components/layout"
import { BrandImage } from "@/components/media"
import { buttonVariants } from "@/components/ui/button"
import {
  formatBlogPublishedDate,
  getAllBlogArticles,
  getBlogArticle,
} from "@/content/blog"
import { resolveBlogArticleCoverImage } from "@/lib/brand/images"
import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"
import { cn } from "@/lib/utils"

interface BlogArticlePageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getAllBlogArticles().map((article) => ({ slug: article.slug }))
}

export async function generateMetadata({
  params,
}: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const article = getBlogArticle(slug)

  if (!article) {
    return { title: "Article" }
  }

  const canonical = `/blog/${article.slug}`

  return {
    title: `${article.title} | ${ELEVATE_BRAND.name}`,
    description: article.excerpt,
    alternates: { canonical },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      url: canonical,
      images: article.coverImage ? [{ url: article.coverImage }] : undefined,
      publishedTime: article.publishedAt,
    },
  }
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params
  const article = getBlogArticle(slug)

  if (!article) {
    notFound()
  }

  const published = formatBlogPublishedDate(article.publishedAt)

  return (
    <main>
      <Section padding="default">
        <Container size="prose">
          <div className="mb-4">
            <BackButton fallbackHref="/blog" label="Back to blog" />
          </div>

          <article className="mx-auto max-w-[46.25rem]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue">
              {article.category}
            </p>
            <h1 className="mt-3.5 font-display text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-tight text-ink">
              {article.title}
            </h1>
            <p className="mt-3.5 mb-6 text-sm text-ink-soft">
              By {article.author}
              {published ? ` · ${published}` : null} · {article.readTime}
            </p>

            <BrandImage
              image={resolveBlogArticleCoverImage(article)}
              containerClassName="mb-6 aspect-[16/8] min-h-[220px] w-full overflow-hidden rounded-[14px] border border-line"
              sizes="(max-width: 860px) 100vw, 740px"
            />

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

              if (block.type === "list") {
                return (
                  <ul
                    key={`list-${index}`}
                    className="mb-4 list-disc space-y-2 pl-5 text-[17px] leading-[1.75] text-ink-soft"
                  >
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
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
