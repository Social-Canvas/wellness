import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { BackButton } from "@/components/layout"
import { Container, Section } from "@/components/layout"
import { BrandImage } from "@/components/media"
import { buttonVariants } from "@/components/ui/button"
import { JsonLdScript } from "@/components/seo/json-ld-script"
import {
  formatBlogPublishedDate,
  getAllBlogArticles,
  getBlogArticle,
  getBlogArticleSeoDescription,
} from "@/content/blog"
import { resolveBlogArticleCoverImage } from "@/lib/brand/images"
import {
  SITE_SEO,
  articleJsonLd,
  buildPublicPageMetadata,
} from "@/lib/seo/site-seo"
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
  const description = getBlogArticleSeoDescription(article)
  const cover = resolveBlogArticleCoverImage(article)
  const image = article.coverImage
    ? { url: cover.src, alt: cover.alt }
    : {
        url: SITE_SEO.ogImage.path,
        width: SITE_SEO.ogImage.width,
        height: SITE_SEO.ogImage.height,
        alt: SITE_SEO.ogImage.alt,
      }

  return buildPublicPageMetadata({
    title: article.title,
    description,
    path: canonical,
    ogType: "article",
    publishedTime: article.publishedAt
      ? `${article.publishedAt}T12:00:00.000Z`
      : undefined,
    authors: [article.author],
    image,
  })
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params
  const article = getBlogArticle(slug)

  if (!article) {
    notFound()
  }

  const published = formatBlogPublishedDate(article.publishedAt)
  const cover = resolveBlogArticleCoverImage(article)

  return (
    <main>
      <JsonLdScript
        data={articleJsonLd({
          title: article.title,
          description: getBlogArticleSeoDescription(article),
          path: `/blog/${article.slug}`,
          publishedAt: article.publishedAt,
          author: article.author,
          imagePath: article.coverImage ?? SITE_SEO.ogImage.path,
        })}
      />
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
              image={cover}
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
