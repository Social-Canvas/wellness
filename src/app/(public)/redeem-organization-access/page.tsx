import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { Container, Section } from "@/components/layout"
import { buttonVariants } from "@/components/ui/button"
import { getCurrentUser } from "@/features/auth/services/auth.service"
import { RedeemOrganizationAccessForm } from "@/features/organizations/components/RedeemOrganizationAccessForm"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Redeem organization access",
  description: "Activate nonprofit-sponsored Elevate membership with an access code.",
}

export default async function RedeemOrganizationAccessPage() {
  const userResult = await getCurrentUser()

  if (!userResult.success) {
    redirect(
      `/login?next=${encodeURIComponent("/redeem-organization-access")}`
    )
  }

  return (
    <main>
      <Section padding="default">
        <Container className="max-w-2xl">
          <p className="text-[11px] font-bold tracking-[0.12em] text-green-deep uppercase">
            Organization sponsorship
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium text-ink md:text-4xl">
            Join your organization’s Elevate membership
          </h1>
          <p className="mt-3 text-ink-soft">
            Enter the access code provided by your nonprofit organization.
          </p>

          <RedeemOrganizationAccessForm />

          <p className="mt-8 text-center text-sm text-ink-soft">
            Looking for personal memberships?{" "}
            <Link
              href="/programs?membership=individuals#memberships"
              className={cn(
                buttonVariants({ variant: "link" }),
                "h-auto p-0 text-blue"
              )}
            >
              View individual plans
            </Link>
          </p>
        </Container>
      </Section>
    </main>
  )
}
