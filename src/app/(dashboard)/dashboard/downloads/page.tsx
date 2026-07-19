import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { BrandImage } from "@/components/media"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { DownloadsLibrary } from "@/features/shop/components/DownloadsLibrary"
import { listPurchasedDownloads } from "@/features/shop/services/shop.service"
import { BRAND_IMAGES } from "@/lib/brand/images"

export const metadata: Metadata = {
  title: "My Downloads",
  description: "Download ebooks and digital products you have purchased.",
}

export default async function DashboardDownloadsPage() {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    redirect("/login")
  }

  const result = await listPurchasedDownloads(profileResult.data.id)

  return (
    <div className="space-y-6">
      <div className="grid items-center gap-6 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm min-[861px]:grid-cols-[1.1fr_0.9fr]">
        <div className="p-6 min-[861px]:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue">
            Downloads
          </p>
          <h1 className="mt-3 font-display text-[28px] font-medium text-ink">
            My downloads
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-soft">
            Secure downloads for ebooks and digital products you own. Links expire
            quickly and are generated only after your access is verified.
          </p>
        </div>
        <BrandImage
          image={BRAND_IMAGES.productCookbook}
          containerClassName="aspect-[16/11] w-full min-h-[180px]"
          sizes="(max-width: 860px) 100vw, 40vw"
        />
      </div>

      {!result.success ? (
        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{result.error.message}</p>
        </div>
      ) : (
        <DownloadsLibrary items={result.data} />
      )}
    </div>
  )
}
