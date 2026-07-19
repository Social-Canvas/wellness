import type { Metadata } from "next";
import { Mulish, Poppins } from "next/font/google";
import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand";
import { BRAND_LOGO_MARK } from "@/lib/brand/logo";
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
  title: ELEVATE_BRAND.name,
  description: ELEVATE_BRAND.tagline,
  icons: {
    icon: BRAND_LOGO_MARK.src,
    apple: BRAND_LOGO_MARK.src,
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
      <body className="min-h-full flex flex-col font-body">{children}</body>
    </html>
  );
}
