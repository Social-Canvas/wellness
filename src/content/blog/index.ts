import { MIGRATED_BLOG_ARTICLES } from "./migrated-articles"
import { SAMPLE_BLOG_ARTICLES } from "./sample-articles"
import type { BlogArticle, BlogCategoryFilter } from "./types"

/**
 * Canonical public blog catalog: migrated Dr. Pattani posts + existing Elevate samples.
 * Sorted newest historical date first; undated samples follow.
 */
export function getAllBlogArticles(): BlogArticle[] {
  const combined = [...MIGRATED_BLOG_ARTICLES, ...SAMPLE_BLOG_ARTICLES]
  return combined.sort((a, b) => {
    const da = a.publishedAt ?? ""
    const db = b.publishedAt ?? ""
    if (da && db) return db.localeCompare(da)
    if (da) return -1
    if (db) return 1
    return a.title.localeCompare(b.title)
  })
}

export function getBlogArticle(slug: string): BlogArticle | undefined {
  return getAllBlogArticles().find((article) => article.slug === slug)
}

export function getBlogArticlesByCategory(
  category: BlogCategoryFilter
): BlogArticle[] {
  const all = getAllBlogArticles()
  if (category === "All") {
    return all
  }
  return all.filter((article) => article.category === category)
}

export function formatBlogPublishedDate(isoDate: string | undefined): string | null {
  if (!isoDate) return null
  const date = new Date(`${isoDate}T12:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}
