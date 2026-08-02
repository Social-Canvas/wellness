import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { Badge } from "@/components/ui"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { ManageBillingButton } from "@/features/billing/components/manage-billing-button"
import { getCurrentSubscription } from "@/features/billing/services/billing.service"
import { getEffectiveMembership } from "@/server/services/membership.service"

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

  const [subscriptionResult, membershipResult] = await Promise.all([
    getCurrentSubscription(profileResult.data.id),
    getEffectiveMembership(profileResult.data.id),
  ])
  const subscription = subscriptionResult.success ? subscriptionResult.data : null
  const membership = membershipResult.success ? membershipResult.data : null
  const profile = profileResult.data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[28px] font-medium text-ink">
          Account &amp; billing
        </h1>
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
          <CardTitle className="font-display text-lg font-medium">Membership</CardTitle>
          {membership && membership.status !== "none" ? (
            <Badge variant="plan">{membership.effectivePlanName ?? "Member"}</Badge>
          ) : (
            <Badge variant="outline">No active plan</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-ink-soft">
          {membership && membership.status !== "none" ? (
            <>
              <p>
                <span className="font-semibold text-ink">Status:</span>{" "}
                {membership.status.replaceAll("_", " ")}
              </p>
              <p>
                <span className="font-semibold text-ink">Access source:</span>{" "}
                {membership.isSponsored
                  ? `Sponsored by ${membership.organizationName ?? "nonprofit"}`
                  : membership.source === "complimentary"
                    ? "Complimentary access"
                    : "Paid personally"}
              </p>
              <p>
                <span className="font-semibold text-ink">Billing period ends:</span>{" "}
                {formatDate(membership.currentPeriodEnd)}
              </p>
              {membership.scheduledPlanName ? (
                <p>
                  <span className="font-semibold text-ink">Scheduled change:</span>{" "}
                  Your plan will change to {membership.scheduledPlanName}
                  {membership.currentPeriodEnd
                    ? ` on ${formatDate(membership.currentPeriodEnd)}`
                    : ""}
                  .
                </p>
              ) : null}
              {membership.cancelAtPeriodEnd ? (
                <p>
                  <span className="font-semibold text-ink">Cancellation:</span> Access
                  continues until {formatDate(membership.currentPeriodEnd)}.
                </p>
              ) : null}
              <p>
                <span className="font-semibold text-ink">In-person sessions:</span>{" "}
                {membership.canAttendInPerson
                  ? "Included in your current plan"
                  : "Not included in your current plan"}
              </p>
              {membership.capabilities.length > 0 ? (
                <div className="pt-2">
                  <p className="font-semibold text-ink">Privileges</p>
                  <ul className="mt-1 list-disc pl-5">
                    {membership.capabilities.map((capability) => (
                      <li key={capability}>{capability.replaceAll("_", " ")}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {membership.hasPersonalBilling ? (
                <ManageBillingButton />
              ) : membership.isSponsored ? (
                <p className="pt-1 text-xs">
                  Billing is managed by your nonprofit sponsor. Contact your
                  administrator for seat or plan changes.
                </p>
              ) : null}
            </>
          ) : subscription ? (
            <>
              <p>
                <span className="font-semibold text-ink">Status:</span>{" "}
                {subscription.status.replaceAll("_", " ")}
              </p>
              <p>
                <span className="font-semibold text-ink">Plan:</span>{" "}
                {subscription.planName}
              </p>
            </>
          ) : (
            <p>
              You do not have an active membership yet. Browse programs to choose a
              plan when checkout is available.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
