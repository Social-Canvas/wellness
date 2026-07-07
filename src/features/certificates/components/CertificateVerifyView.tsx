import { Award } from "lucide-react"

import { Card, CardContent } from "@/components/ui"
import { BrandImage } from "@/components/media"
import type { VerifiedCertificate } from "@/features/certificates/types"
import { BRAND_IMAGES } from "@/lib/brand/images"

interface CertificateVerifyViewProps {
  certificate: VerifiedCertificate
}

function formatIssuedDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
  }).format(new Date(value))
}

export function CertificateVerifyView({ certificate }: CertificateVerifyViewProps) {
  return (
    <div className="mx-auto w-full max-w-[720px]">
      <Card className="overflow-hidden border-2 border-blue shadow-sm">
        <BrandImage
          image={BRAND_IMAGES.certificate}
          containerClassName="aspect-[4/3] w-full border-b border-line bg-white"
          sizes="(max-width: 768px) 100vw, 720px"
        />
        <CardContent className="space-y-6 px-6 py-8 sm:px-10 sm:py-10">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue">
              Certificate of completion
            </p>
            <h1 className="mt-3 font-display text-3xl font-medium tracking-tight text-ink">
              {certificate.courseTitle}
            </h1>
          </div>

          <div className="text-center">
            <p className="text-sm text-ink-soft">Awarded to</p>
            <p className="mt-1 font-display text-[26px] font-medium text-blue">
              {certificate.recipientName}
            </p>
          </div>

          <div className="grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Certificate number
              </p>
              <p className="mt-1 font-mono text-sm font-medium text-ink">
                {certificate.certificateNumber}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Date issued
              </p>
              <p className="mt-1 text-sm font-medium text-ink">
                {formatIssuedDate(certificate.issuedAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 rounded-2xl bg-green-soft px-4 py-3 text-sm font-medium text-green-deep">
            <Award className="size-4" aria-hidden="true" />
            Verified certificate
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
