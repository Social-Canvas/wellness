import type { Metadata } from "next";
import { Mulish, Poppins } from "next/font/google";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import {
  SITE_SEO,
  getPublicMetadataOrigin,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo/site-seo";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getPublicMetadataOrigin()),
  title: {
    default: SITE_SEO.homeTitle,
    template: `%s | ${SITE_SEO.siteName}`,
  },
  description: SITE_SEO.homeDescription,
  applicationName: SITE_SEO.siteName,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_SEO.siteName,
    locale: "en_US",
    url: getPublicMetadataOrigin(),
    title: SITE_SEO.homeTitle,
    description: SITE_SEO.homeDescription,
    images: [
      {
        url: SITE_SEO.ogImage.path,
        width: SITE_SEO.ogImage.width,
        height: SITE_SEO.ogImage.height,
        alt: SITE_SEO.ogImage.alt,
      },
    ],
  },
  twitter: {
    card: SITE_SEO.twitterCard,
    title: SITE_SEO.homeTitle,
    description: SITE_SEO.homeDescription,
    images: [
      {
        url: SITE_SEO.ogImage.path,
        alt: SITE_SEO.ogImage.alt,
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${mulish.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body">
        <JsonLdScript data={organizationJsonLd()} />
        <JsonLdScript data={websiteJsonLd()} />
        {children}
      </body>
    </html>
  );
}
