import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { Badge } from "@/components/ui"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { getCurrentSubscription } from "@/features/billing/services/billing.service"

export const metadata: Metadata = {
  title: "Account & Billing",
  description: "Manage your profile and subscription.",
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—"
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value))
}

export default async function DashboardAccountPage() {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    redirect("/login")
  }

  const subscriptionResult = await getCurrentSubscription(profileResult.data.id)
  const subscription = subscriptionResult.success ? subscriptionResult.data : null
  const profile = profileResult.data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[28px] font-medium text-ink">Account &amp; billing</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Review your profile details and membership status.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg font-medium">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-ink-soft">
          <p>
            <span className="font-semibold text-ink">Name:</span>{" "}
            {profile.fullName ?? "Not set"}
          </p>
          <p>
            <span className="font-semibold text-ink">Email:</span> {profile.email}
          </p>
          <p>
            <span className="font-semibold text-ink">Phone:</span>{" "}
            {profile.phone ?? "Not set"}
          </p>
          <p>
            <span className="font-semibold text-ink">Role:</span> {profile.role}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="font-display text-lg font-medium">Subscription</CardTitle>
          {subscription ? (
            <Badge variant="plan">{subscription.planName}</Badge>
          ) : (
            <Badge variant="outline">No active plan</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-ink-soft">
          {subscription ? (
            <>
              <p>
                <span className="font-semibold text-ink">Status:</span>{" "}
                {subscription.status.replaceAll("_", " ")}
              </p>
              <p>
                <span className="font-semibold text-ink">Billing:</span>{" "}
                {subscription.billingInterval ?? "—"}
              </p>
              <p>
                <span className="font-semibold text-ink">Current period ends:</span>{" "}
                {formatDate(subscription.currentPeriodEnd)}
              </p>
              <p>
                <span className="font-semibold text-ink">Cancel at period end:</span>{" "}
                {subscription.cancelAtPeriodEnd ? "Yes" : "No"}
              </p>
            </>
          ) : (
            <p>
              You do not have an active membership subscription yet. Browse programs to
              choose a plan when checkout is available.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
