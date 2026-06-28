import Link from "next/link"
import { Award, ExternalLink } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import type { CertificateWithCourse } from "@/features/certificates/types"
import { env } from "@/lib/config"
import { cn } from "@/lib/utils"

interface CourseCertificateCardProps {
  certificate: CertificateWithCourse
}

function formatIssuedDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
  }).format(new Date(value))
}

export function CourseCertificateCard({ certificate }: CourseCertificateCardProps) {
  const verifyUrl = `${env.NEXT_PUBLIC_APP_URL}/certificate/verify/${certificate.verificationToken}`

  return (
    <Card className="border-blue/20 bg-blue-soft/30">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue text-white">
            <Award className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="font-display text-xl font-medium text-ink">
              Certificate earned
            </CardTitle>
            <p className="mt-1 text-sm text-ink-soft">
              You completed {certificate.course.title}. Your certificate is ready to view and
              share.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Certificate number
            </dt>
            <dd className="mt-1 font-mono text-sm font-medium text-ink">
              {certificate.certificateNumber}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Issued
            </dt>
            <dd className="mt-1 text-sm font-medium text-ink">
              {formatIssuedDate(certificate.issuedAt)}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/certificate/verify/${certificate.verificationToken}`}
            className={cn(buttonVariants())}
          >
            View certificate
          </Link>
          <a
            href={verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Share verification link
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
