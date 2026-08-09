import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://elevatehealthsolutions.com"
  ).replace(/\/$/, "")

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
    "/free-taster",
    "/live-breathwork",
    "/privacy",
  ] as const

  return paths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/" || path === "/nonprofits" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/nonprofits" || path === "/programs" ? 0.9 : 0.7,
  }))
}
