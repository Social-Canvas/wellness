import { Award } from "lucide-react"

import { Card, CardContent } from "@/components/ui"
import type { VerifiedCertificate } from "@/features/certificates/types"

interface CertificateVerifyViewProps {
  certificate: VerifiedCertificate
}

function formatIssuedDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
  }).format(new Date(value))
}

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "W"
}

export function CertificateVerifyView({ certificate }: CertificateVerifyViewProps) {
  return (
    <div className="mx-auto w-full max-w-[720px]">
      <Card className="overflow-hidden border-2 border-blue">
        <CardContent className="space-y-8 px-6 py-10 sm:px-10 sm:py-12">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue">
              Certificate of completion
            </p>
            <h1 className="mt-3 font-display text-3xl font-medium tracking-tight text-ink">
              {certificate.courseTitle}
            </h1>
          </div>

          <div className="flex flex-col items-center gap-5 text-center">
            <div
              className="flex size-[60px] items-center justify-center rounded-full bg-blue font-display text-2xl font-medium text-white"
              aria-hidden="true"
            >
              {getInitial(certificate.recipientName)}
            </div>
            <div>
              <p className="text-sm text-ink-soft">Awarded to</p>
              <p className="mt-1 font-display text-[26px] font-medium text-blue">
                {certificate.recipientName}
              </p>
            </div>
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
