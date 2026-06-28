import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Certificate Verification",
}

export default function CertificateLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-[72vh] bg-cream px-[26px] py-14">
      {children}
    </main>
  )
}
