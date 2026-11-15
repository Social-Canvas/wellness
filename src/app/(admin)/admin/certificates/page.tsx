import Link from "next/link"

export const metadata = {
  title: "Certificates",
  robots: { index: false, follow: false },
}

export default function AdminCertificatesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-[28px] font-medium text-ink">
          Certificates
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          This page is not in the admin menu. Member certificates are issued from course completion. Members view them
          at Dashboard → Certificates. Public verification is at
          /certificate/verify/[token]. Admin certificate-name corrections live on
          Admin → Members.
        </p>
      </div>
      <div className="rounded-2xl border border-dashed border-line bg-cream2/50 px-6 py-8">
        <p className="text-sm text-ink">Status: partially implemented</p>
        <p className="mt-2 text-sm text-ink-soft">
          This dedicated admin list is not built. Use{" "}
          <Link href="/admin/members" className="font-semibold text-blue">
            Members
          </Link>{" "}
          for audited certificate-name corrections.
        </p>
      </div>
    </div>
  )
}
