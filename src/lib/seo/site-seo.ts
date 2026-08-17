import type { Metadata } from "next"

import { getCanonicalAppUrl } from "@/lib/config/app-url"
import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"
import { ELEVATE_SOCIAL_URLS } from "@/lib/constants/social-links"

/** Canonical public origin for production SEO, sitemap, and social metadata. */
export const CANONICAL_PRODUCTION_ORIGIN = "https://elevate-healthsolutions.com"

export const SITE_SEO = {
  siteName: "Elevate Health Solutions",
  homeTitle: "Elevate Health Solutions | Dr. Deepa Patani",
  homeDescription:
    "A root-cause approach to health through functional medicine, holistic healing and personalised solutions designed around you.",
  ogImage: {
    path: "/brand/elevate-og-square.jpg",
    width: 1200,
    height: 1200,
    alt: "Elevate Health Solutions",
  },
  twitterCard: "summary" as const,
} as const

export type PublicOgImage = {
  url: string
  width?: number
  height?: number
  alt: string
}

function remapStaleSeoHost(origin: string): string {
  try {
    const url = new URL(origin)
    if (
      url.hostname === "elevatehealthsolutions.com" ||
      url.hostname.endsWith(".elevatehealthsolutions.com") ||
      url.hostname === "wellness-topaz-chi.vercel.app"
    ) {
      return CANONICAL_PRODUCTION_ORIGIN
    }
    return origin.replace(/\/$/, "")
  } catch {
    return CANONICAL_PRODUCTION_ORIGIN
  }
}

/**
 * Origin for public metadata, sitemap, robots, and structured data.
 * Production always uses the hyphenated Elevate domain.
 * Preview and local keep their configured origin (with the unhyphenated typo remapped).
 */
export function getPublicMetadataOrigin(): string {
  if (process.env.VERCEL_ENV === "production") {
    return CANONICAL_PRODUCTION_ORIGIN
  }

  try {
    return remapStaleSeoHost(getCanonicalAppUrl())
  } catch {
    return CANONICAL_PRODUCTION_ORIGIN
  }
}

export function publicAbsoluteUrl(path: string): string {
  const origin = getPublicMetadataOrigin()
  if (!path || path === "/") {
    return origin
  }
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${origin}${normalized}`
}

export function defaultSocialImage(): PublicOgImage {
  return {
    url: SITE_SEO.ogImage.path,
    width: SITE_SEO.ogImage.width,
    height: SITE_SEO.ogImage.height,
    alt: SITE_SEO.ogImage.alt,
  }
}

export function buildPublicPageMetadata(input: {
  title: string
  description: string
  path: string
  absoluteTitle?: boolean
  image?: PublicOgImage
  ogType?: "website" | "article"
  publishedTime?: string
  authors?: string[]
  robots?: Metadata["robots"]
}): Metadata {
  const canonicalPath = input.path === "/" ? "/" : input.path
  const canonicalUrl = publicAbsoluteUrl(canonicalPath)
  const image = input.image ?? defaultSocialImage()
  const ogType = input.ogType ?? "website"

  const openGraphImages = [
    {
      url: image.url,
      width: image.width,
      height: image.height,
      alt: image.alt,
    },
  ]

  return {
    title: input.absoluteTitle
      ? { absolute: input.title }
      : input.title,
    description: input.description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: ogType,
      siteName: SITE_SEO.siteName,
      locale: "en_US",
      url: canonicalUrl,
      title: input.title,
      description: input.description,
      images: openGraphImages,
      ...(ogType === "article" && input.publishedTime
        ? { publishedTime: input.publishedTime }
        : {}),
      ...(ogType === "article" && input.authors
        ? { authors: input.authors }
        : {}),
    },
    twitter: {
      card: SITE_SEO.twitterCard,
      title: input.title,
      description: input.description,
      images: [
        {
          url: image.url,
          alt: image.alt,
        },
      ],
    },
    ...(input.robots ? { robots: input.robots } : {}),
  }
}

export function organizationJsonLd(): Record<string, unknown> {
  const origin = getPublicMetadataOrigin()
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_SEO.siteName,
    url: origin,
    logo: publicAbsoluteUrl(SITE_SEO.ogImage.path),
    founder: {
      "@type": "Person",
      name: ELEVATE_BRAND.founder,
    },
    sameAs: [
      ELEVATE_SOCIAL_URLS.instagram,
      ELEVATE_SOCIAL_URLS.facebook,
      ELEVATE_SOCIAL_URLS.linkedin,
    ],
  }
}

export function websiteJsonLd(): Record<string, unknown> {
  const origin = getPublicMetadataOrigin()
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_SEO.siteName,
    url: origin,
  }
}

export function personJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: ELEVATE_BRAND.founder,
    jobTitle: "Founder",
    worksFor: {
      "@type": "Organization",
      name: SITE_SEO.siteName,
      url: getPublicMetadataOrigin(),
    },
    url: publicAbsoluteUrl("/about"),
    sameAs: [
      ELEVATE_SOCIAL_URLS.instagram,
      ELEVATE_SOCIAL_URLS.facebook,
      ELEVATE_SOCIAL_URLS.linkedin,
    ],
  }
}

export function articleJsonLd(input: {
  title: string
  description: string
  path: string
  publishedAt?: string
  author: string
  imagePath: string
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    url: publicAbsoluteUrl(input.path),
    image: publicAbsoluteUrl(input.imagePath),
    author: {
      "@type": "Person",
      name: input.author,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_SEO.siteName,
      logo: {
        "@type": "ImageObject",
        url: publicAbsoluteUrl(SITE_SEO.ogImage.path),
      },
    },
    ...(input.publishedAt
      ? { datePublished: input.publishedAt, dateModified: input.publishedAt }
      : {}),
    mainEntityOfPage: publicAbsoluteUrl(input.path),
  }
}
