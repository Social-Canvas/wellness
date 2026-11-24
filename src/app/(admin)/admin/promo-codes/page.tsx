import type { Metadata } from "next"

import { getCurrentUser } from "@/features/auth/services/auth.service"
import { PromoCodeForm } from "@/features/promo-codes/components/promo-code-form"
import { PromoCodeList } from "@/features/promo-codes/components/promo-code-list"
import { listPromoCodes } from "@/features/promo-codes/services/promo-codes.service"

export const metadata: Metadata = {
  title: "Promo codes",
  robots: { index: false, follow: false },
}

const HELPER_TEXT =
  "This code appears on Stripe Checkout after the customer clicks buy on a product such as the Reset. It does not show on the homepage. Membership checkout does not take a code."

export default async function AdminPromoCodesPage() {
  const user = await getCurrentUser()
  const isSuperAdmin = user.success && user.data.role === "super_admin"

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[28px] font-medium text-ink">Promo codes</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">{HELPER_TEXT}</p>
      </div>

      {isSuperAdmin ? (
        <SuperAdminPromoCodes />
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-cream2/50 px-6 py-8">
          <p className="text-sm text-ink">Status: super admin only</p>
          <p className="mt-2 text-sm text-ink-soft">
            Only a super admin can create or view promo codes.
          </p>
        </div>
      )}
    </div>
  )
}

async function SuperAdminPromoCodes() {
  const result = await listPromoCodes()

  return (
    <div className="space-y-6">
      <PromoCodeForm />
      {result.success ? (
        <PromoCodeList items={result.data.items} truncated={result.data.truncated} />
      ) : (
        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{result.error.message}</p>
        </div>
      )}
    </div>
  )
}
