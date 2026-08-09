import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..")

function read(rel: string): string {
  return readFileSync(join(root, "src", rel), "utf8")
}

describe("blog migration catalog", () => {
  it("migrates 17 unique articles and skips the -1 duplicate slug", () => {
    const migrated = read("content/blog/migrated-articles.ts")
    const matches = migrated.match(/^\s+slug: "/gm) ?? []
    assert.equal(matches.length, 17)
    assert.doesNotMatch(
      migrated,
      /slug: "how-breathwork-works-with-functional-medicine-1"/
    )
    assert.match(
      migrated,
      /slug: "how-breathwork-works-with-functional-medicine"/
    )
  })

  it("preserves historical dates and categories", () => {
    const migrated = read("content/blog/migrated-articles.ts")
    assert.match(migrated, /publishedAt: "2025-02-07"/)
    assert.match(migrated, /category: "Breathwork"/)
    assert.match(migrated, /category: "Functional Medicine"/)
    assert.match(migrated, /category: "Energy Healing"/)
    assert.match(migrated, /author: "Dr\. Deepa Pattani"/)
  })

  it("references local cover images under /blog", () => {
    const migrated = read("content/blog/migrated-articles.ts")
    assert.match(migrated, /coverImage: "\/blog\//)
    assert.doesNotMatch(migrated, /coverImage: "https:\/\/www\.drdeepapattani\.com/)
  })

  it("wires blog index filters, detail routes, and sitemap", () => {
    const index = read("content/blog/index.ts")
    const blogPage = read("app/(public)/blog/page.tsx")
    const detail = read("app/(public)/blog/[slug]/page.tsx")
    const grid = read("components/marketing/blog-article-grid.tsx")
    const sitemap = read("app/sitemap.ts")

    assert.match(index, /MIGRATED_BLOG_ARTICLES/)
    assert.match(index, /SAMPLE_BLOG_ARTICLES/)
    assert.match(blogPage, /BlogArticleGrid/)
    assert.match(blogPage, /getAllBlogArticles/)
    assert.match(detail, /getAllBlogArticles/)
    assert.match(detail, /publishedAt/)
    assert.match(grid, /BLOG_CATEGORY_FILTERS/)
    const types = read("content/blog/types.ts")
    assert.match(types, /Breathwork/)
    assert.match(types, /Functional Medicine/)
    assert.match(types, /Energy Healing/)
    assert.match(sitemap, /getAllBlogArticles/)
    assert.match(sitemap, /\/blog\/\$\{article\.slug\}/)
  })
})
