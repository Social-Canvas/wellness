import type { MetadataRoute } from "next"

import { getAllBlogArticles } from "@/content/blog"
import { getPublicMetadataOrigin } from "@/lib/seo/site-seo"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getPublicMetadataOrigin()

  const paths = [
    "/",
    "/programs",
    "/nonprofits",
    "/shop",
    "/blog",
    "/about",
    "/retreats",
    "/vip",
    "/private-events",
    "/live-breathwork",
    "/privacy",
  ] as const

  const staticEntries = paths.map((path) => ({
    url: `${baseUrl}${path === "/" ? "" : path}`,
    lastModified: new Date(),
    changeFrequency:
      path === "/" || path === "/nonprofits"
        ? ("weekly" as const)
        : ("monthly" as const),
    priority:
      path === "/"
        ? 1
        : path === "/nonprofits" || path === "/programs"
          ? 0.9
          : 0.7,
  }))

  const blogEntries = getAllBlogArticles().map((article) => ({
    url: `${baseUrl}/blog/${article.slug}`,
    lastModified: article.publishedAt
      ? new Date(`${article.publishedAt}T12:00:00.000Z`)
      : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))

  return [...staticEntries, ...blogEntries]
}
