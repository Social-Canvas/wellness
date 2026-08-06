import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { Badge } from "@/components/ui"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { BillingChangeConfirm } from "@/features/billing/components/billing-change-confirm"
import { ManageBillingButton } from "@/features/billing/components/manage-billing-button"
import { ScheduleDowngradeConfirm } from "@/features/billing/components/schedule-downgrade-confirm"
import { getCurrentSubscription } from "@/features/billing/services/billing.service"
import {
  formatCapabilityCustomerLabel,
  formatMembershipAccessSource,
  formatMembershipStatusLabel,
} from "@/features/dashboard/utils/library-membership"
import { billingIntervalLabel } from "@/lib/constants/membership-pricing"
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

function parseDowngradeSlug(
  value: string | string[] | undefined
): "plan-1" | "plan-2" | "plan-3" | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === "plan-1" || raw === "plan-2" || raw === "plan-3") {
    return raw
  }
  return null
}

function parseSwitchInterval(
  value: string | string[] | undefined
): "monthly" | "yearly" | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === "monthly" || raw === "yearly") {
    return raw
  }
  return null
}

type AccountPageProps = {
  searchParams: Promise<{
    downgrade?: string | string[]
    switchInterval?: string | string[]
    plan?: string | string[]
  }>
}

export default async function DashboardAccountPage({
  searchParams,
}: AccountPageProps) {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    redirect("/login")
  }

  const params = await searchParams
  const requestedDowngrade = parseDowngradeSlug(params.downgrade)
  const requestedSwitchInterval = parseSwitchInterval(params.switchInterval)
  const requestedSwitchPlan = parseDowngradeSlug(params.plan)

  const [subscriptionResult, membershipResult] = await Promise.all([
    getCurrentSubscription(profileResult.data.id),
    getEffectiveMembership(profileResult.data.id),
  ])
  const subscription = subscriptionResult.success ? subscriptionResult.data : null
  const membership = membershipResult.success ? membershipResult.data : null
  const profile = profileResult.data

  const canConfirmDowngrade =
    Boolean(requestedDowngrade) &&
    Boolean(membership?.hasPersonalBilling) &&
    Boolean(
      membership &&
        requestedDowngrade &&
        membership.downgradePlanSlugs.includes(requestedDowngrade)
    ) &&
    !membership?.scheduledPlanId &&
    !membership?.scheduledBillingInterval &&
    !membership?.cancelAtPeriodEnd

  const canConfirmBillingChange =
    Boolean(requestedSwitchInterval) &&
    Boolean(requestedSwitchPlan) &&
    Boolean(membership?.hasPersonalBilling) &&
    !membership?.scheduledPlanId &&
    !membership?.scheduledBillingInterval &&
    !membership?.cancelAtPeriodEnd

  const cadenceLabel = billingIntervalLabel(membership?.billingInterval ?? null)
  const renewsLabel =
    membership?.currentPeriodEnd != null
      ? formatDate(membership.currentPeriodEnd)
      : null

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
        <CardContent className="space-y-4 text-sm text-ink-soft">
          <div>
            <p>
              <span className="font-semibold text-ink">Certificate name</span>
            </p>
            <p className="mt-1 text-base font-medium text-ink">
              {profile.certificateName ?? "Not confirmed"}
            </p>
            <p className="mt-1 text-xs">
              This name is locked because it is used on your certificates. Contact
              support if a correction is required.
            </p>
          </div>
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
                {formatMembershipStatusLabel(membership.status)}
              </p>
              <p>
                <span className="font-semibold text-ink">Access source:</span>{" "}
                {membership.isSponsored
                  ? `Sponsored by ${membership.organizationName ?? "nonprofit"}`
                  : formatMembershipAccessSource(membership.source)}
              </p>
              {membership.hasPersonalBilling && cadenceLabel ? (
                <p>
                  <span className="font-semibold text-ink">Billing:</span>{" "}
                  {cadenceLabel}
                  {renewsLabel ? ` · Renews ${renewsLabel}` : ""}
                </p>
              ) : null}
              <p>
                <span className="font-semibold text-ink">Billing period ends:</span>{" "}
                {formatDate(membership.currentPeriodEnd)}
              </p>
              {membership.scheduledPlanName || membership.scheduledBillingInterval ? (
                <p>
                  <span className="font-semibold text-ink">Scheduled change:</span>{" "}
                  {membership.scheduledPlanName
                    ? `Your plan will change to ${membership.scheduledPlanName}`
                    : "Your billing cadence will change"}
                  {membership.scheduledBillingInterval
                    ? ` (${membership.scheduledBillingInterval === "yearly" ? "annual" : "monthly"} billing)`
                    : ""}
                  {membership.currentPeriodEnd
                    ? ` on ${formatDate(membership.currentPeriodEnd)}`
                    : ""}
                  .
                </p>
              ) : null}
              {membership.cancelAtPeriodEnd ? (
                <p>
                  <span className="font-semibold text-ink">Cancellation:</span>{" "}
                  {membership.billingInterval === "yearly"
                    ? `Your annual membership remains active until ${formatDate(membership.currentPeriodEnd)}.`
                    : `Access continues until ${formatDate(membership.currentPeriodEnd)}.`}
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
                      <li key={capability}>
                        {formatCapabilityCustomerLabel(capability)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {canConfirmDowngrade && requestedDowngrade ? (
                <div className="pt-3">
                  <ScheduleDowngradeConfirm targetPlanSlug={requestedDowngrade} />
                </div>
              ) : null}
              {canConfirmBillingChange &&
              requestedSwitchPlan &&
              requestedSwitchInterval ? (
                <div className="pt-3">
                  <BillingChangeConfirm
                    targetPlanSlug={requestedSwitchPlan}
                    targetBillingInterval={requestedSwitchInterval}
                  />
                </div>
              ) : null}
              {membership.hasPersonalBilling ? (
                <ManageBillingButton />
              ) : membership.isSponsored ? (
                <p className="pt-1 text-xs">
                  Billing is managed by your nonprofit sponsor. Contact your
                  administrator for seat or plan changes.
                </p>
              ) : membership.source === "complimentary" ? (
                <p className="pt-1 text-xs">
                  Complimentary access — plan changes are managed by an
                  administrator.
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
