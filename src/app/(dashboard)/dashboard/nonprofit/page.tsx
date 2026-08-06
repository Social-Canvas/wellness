import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { Badge } from "@/components/ui"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import {
  OrganizationAccessControls,
  PlatformCreateOrganizationForm,
} from "@/features/organizations/components/OrganizationAccessControls"
import {
  assignOrganizationAdministratorAction,
  upsertNonprofitOrganizationAction,
} from "@/features/organizations/actions/organization-admin.actions"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  countActiveOrganizationSeats,
  countOccupiedOrganizationSeats,
} from "@/server/services/membership.service"
import { getOrganizationAccessCodeMetadata } from "@/server/services/organization-access-code.service"
import type { SupabaseClient } from "@supabase/supabase-js"

export const metadata: Metadata = {
  title: "Nonprofit administration",
  description: "Manage nonprofit partnership seats, access codes, and members.",
}

function membershipDb(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient
}

async function createOrganizationFromForm(formData: FormData) {
  "use server"

  const organizationIdRaw = String(formData.get("organizationId") ?? "").trim()
  const adminEmail = String(formData.get("adminEmail") ?? "").trim()

  const result = await upsertNonprofitOrganizationAction({
    organizationId: organizationIdRaw || null,
    name: String(formData.get("name") ?? ""),
    seatLimit: Number(formData.get("seatLimit") ?? 0),
    status: String(formData.get("status") ?? "active") as
      | "pending"
      | "approved"
      | "active"
      | "suspended"
      | "expired"
      | "cancelled",
    billingStatus: String(formData.get("billingStatus") ?? "manual_contract") as
      | "unpaid"
      | "invoiced"
      | "paid"
      | "manual_contract"
      | "stripe_subscription"
      | "past_due"
      | "cancelled",
    directActivation: true,
  })

  if (!result.success) {
    return { ok: false, message: result.error.message }
  }

  if (adminEmail) {
    const assign = await assignOrganizationAdministratorAction({
      organizationId: result.data.id,
      email: adminEmail,
    })
    if (!assign.success) {
      return {
        ok: false,
        message: `Organization saved, but administrator assignment failed: ${assign.error.message}`,
      }
    }
  }

  return {
    ok: true,
    message: `Organization saved (${result.data.id}). Generate an access code below after payment confirmation.`,
  }
}

export default async function NonprofitAdminPage() {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    redirect("/login")
  }

  if (
    profileResult.data.role !== "admin" &&
    profileResult.data.role !== "super_admin"
  ) {
    redirect("/dashboard")
  }

  const supabase = membershipDb()
  const { data: organizations } = await supabase
    .from("organizations")
    .select(
      "id, name, status, seat_limit, access_model, billing_status, access_start_at, access_end_at, direct_activation"
    )
    .order("created_at", { ascending: false })
    .limit(20)

  const orgs = (organizations ?? []) as Array<{
    id: string
    name: string
    status: string
    seat_limit: number
    access_model: string
    billing_status?: string
    access_start_at?: string | null
    access_end_at?: string | null
    direct_activation?: boolean
  }>

  const orgDetails = await Promise.all(
    orgs.map(async (organization) => {
      const [activeSeats, occupiedSeats, membersResult, codeMeta] =
        await Promise.all([
          countActiveOrganizationSeats(organization.id),
          countOccupiedOrganizationSeats(organization.id),
          supabase
            .from("organization_members")
            .select("id, email, role, status")
            .eq("organization_id", organization.id)
            .neq("status", "removed")
            .order("created_at", { ascending: false })
            .limit(50),
          getOrganizationAccessCodeMetadata(organization.id),
        ])

      const occupied = occupiedSeats.success ? occupiedSeats.data : 0
      const available =
        organization.seat_limit > 0
          ? Math.max(0, organization.seat_limit - occupied)
          : null

      return {
        organization,
        activeSeats: activeSeats.success ? activeSeats.data : 0,
        occupiedSeats: occupied,
        availableSeats: available,
        members: (membersResult.data ?? []) as Array<{
          id: string
          email: string
          role: string
          status: string
        }>,
        code: codeMeta.success ? codeMeta.data : null,
      }
    })
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[28px] font-medium text-ink">
          Nonprofit administration
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Review enquiries separately, then create organizations, set seat
          limits, confirm billing, assign administrators, and generate access
          codes. Sponsored access is Platinum-equivalent.
        </p>
      </div>

      <PlatformCreateOrganizationForm onSubmitAction={createOrganizationFromForm} />

      {orgDetails.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-ink-soft">
            No nonprofit organizations are configured yet.
          </CardContent>
        </Card>
      ) : (
        orgDetails.map(
          ({
            organization,
            activeSeats,
            occupiedSeats,
            availableSeats,
            members,
            code,
          }) => (
            <Card key={organization.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="font-display text-lg font-medium">
                  {organization.name}
                </CardTitle>
                <Badge variant="outline">{organization.status}</Badge>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-ink-soft">
                <p>
                  <span className="font-semibold text-ink">Sponsored access:</span>{" "}
                  Platinum-equivalent
                </p>
                <p>
                  <span className="font-semibold text-ink">Billing:</span>{" "}
                  {organization.billing_status ?? "unpaid"}
                </p>
                <p>
                  <span className="font-semibold text-ink">Seats:</span>{" "}
                  {occupiedSeats} occupied / {organization.seat_limit || "unlimited"}{" "}
                  limit
                  {availableSeats !== null ? ` · ${availableSeats} available` : ""}
                  {" · "}
                  {activeSeats} active ·{" "}
                  {
                    members.filter((member) => member.status === "suspended")
                      .length
                  }{" "}
                  suspended
                </p>
                <OrganizationAccessControls
                  organizationId={organization.id}
                  codePrefix={code?.codePrefix ?? null}
                  codeStatus={code?.status ?? null}
                  codeExpiresAt={code?.expiresAt ?? null}
                  members={members}
                />
              </CardContent>
            </Card>
          )
        )
      )}
    </div>
  )
}
