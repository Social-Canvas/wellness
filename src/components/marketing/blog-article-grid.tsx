"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { BrandImage } from "@/components/media"
import {
  BLOG_CATEGORY_FILTERS,
  type BlogArticle,
  type BlogCategoryFilter,
} from "@/content/blog/types"
import { formatBlogPublishedDate } from "@/content/blog"
import { resolveBlogArticleCoverImage } from "@/lib/brand/images"
import { cn } from "@/lib/utils"

type BlogArticleGridProps = {
  articles: BlogArticle[]
}

export function BlogArticleGrid({ articles }: BlogArticleGridProps) {
  const [category, setCategory] = useState<BlogCategoryFilter>("All")

  const visible = useMemo(() => {
    if (category === "All") {
      return articles
    }
    return articles.filter((article) => article.category === category)
  }, [articles, category])

  return (
    <div>
      <div
        role="tablist"
        aria-label="Blog categories"
        className="flex flex-wrap justify-center gap-2"
      >
        {BLOG_CATEGORY_FILTERS.map((filter) => {
          const selected = category === filter
          return (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setCategory(filter)}
              className={cn(
                "min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2",
                selected
                  ? "border-blue bg-blue text-white"
                  : "border-line bg-surface text-ink-soft hover:text-ink"
              )}
            >
              {filter}
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 text-center text-ink-soft">
          No articles in this category yet.
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-5 min-[861px]:grid-cols-3">
          {visible.map((article) => {
            const published = formatBlogPublishedDate(article.publishedAt)
            return (
              <article
                key={article.slug}
                className="overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-sm"
              >
                <Link href={`/blog/${article.slug}`} className="block">
                  <BrandImage
                    image={resolveBlogArticleCoverImage(article)}
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
                    <p className="mt-1.5 text-[13.5px] text-ink-soft">
                      {article.excerpt}
                    </p>
                    <p className="mt-3 text-xs text-ink-soft">
                      {published ? `${published} · ` : null}
                      {article.readTime}
                    </p>
                  </div>
                </Link>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
