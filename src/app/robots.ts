import type { MetadataRoute } from "next"

import { getPublicMetadataOrigin } from "@/lib/seo/site-seo"

export default function robots(): MetadataRoute.Robots {
  const origin = getPublicMetadataOrigin()

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/dashboard/",
          "/api/",
          "/auth/",
          "/checkout/",
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/verified",
          "/verification-failed",
          "/certificate-name",
          "/redeem-organization-access",
          "/free-taster",
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  }
}
