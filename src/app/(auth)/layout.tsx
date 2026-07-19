import type { Metadata } from "next"
import type { ReactNode } from "react"

import { BrandLogo } from "@/components/layout/brand-logo"

export const metadata: Metadata = {
  title: "Account",
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-[72vh] items-center justify-center bg-blue-soft px-[26px] py-[50px]">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex justify-center">
          <BrandLogo variant="horizontal" size="md" href="/" priority />
        </div>
        {children}
      </div>
    </main>
  )
}
