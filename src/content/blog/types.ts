export type BlogContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | {
      type: "cta"
      title: string
      description: string
      href: string
      label: string
    }

export type BlogArticle = {
  slug: string
  category: string
  title: string
  excerpt: string
  readTime: string
  author: string
  /** ISO date YYYY-MM-DD when known (historical migrations). */
  publishedAt?: string
  /** Public path under /blog or /brand when present. */
  coverImage?: string
  /** Original source URL for migrated posts. */
  sourceUrl?: string
  content: BlogContentBlock[]
}

export const BLOG_CATEGORY_FILTERS = [
  "All",
  "Breathwork",
  "Functional Medicine",
  "Energy Healing",
] as const

export type BlogCategoryFilter = (typeof BLOG_CATEGORY_FILTERS)[number]
