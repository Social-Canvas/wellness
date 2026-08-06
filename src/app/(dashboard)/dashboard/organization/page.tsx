import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import type { SupabaseClient } from "@supabase/supabase-js"

import { Badge } from "@/components/ui"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { buttonVariants } from "@/components/ui/button"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { OrganizationAccessControls } from "@/features/organizations/components/OrganizationAccessControls"
import { createAdminClient } from "@/lib/supabase/admin"
import { cn } from "@/lib/utils"
import {
  countActiveOrganizationSeats,
  countOccupiedOrganizationSeats,
} from "@/server/services/membership.service"
import { getOrganizationAccessCodeMetadata } from "@/server/services/organization-access-code.service"

export const metadata: Metadata = {
  title: "Organization administration",
  description: "Manage your nonprofit’s Elevate seats and access code.",
}

function membershipDb(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient
}

export default async function OrganizationAdminPage() {
  const profileResult = await getCurrentProfile()
  if (!profileResult.success) {
    redirect("/login")
  }

  const supabase = membershipDb()
  const { data: memberships } = await supabase
    .from("organization_members")
    .select(
      "id, role, status, organization_id, organizations ( id, name, status, seat_limit, billing_status )"
    )
    .eq("user_id", profileResult.data.id)
    .eq("status", "active")
    .in("role", ["owner", "administrator"])

  type Row = {
    organization_id: string
    role: string
    organizations: {
      id: string
      name: string
      status: string
      seat_limit: number
      billing_status?: string
    } | null
  }

  const rows = (memberships ?? []) as unknown as Row[]
  if (rows.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-[28px] font-medium text-ink">
          Organization administration
        </h1>
        <p className="text-sm text-ink-soft">
          You are not an administrator for any nonprofit organization yet.
        </p>
        <Link
          href="/redeem-organization-access"
          className={cn(buttonVariants(), "inline-flex")}
        >
          Redeem an access code
        </Link>
      </div>
    )
  }

  const details = await Promise.all(
    rows.map(async (row) => {
      const organization = row.organizations
      if (!organization) {
        return null
      }
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
            .limit(100),
          getOrganizationAccessCodeMetadata(organization.id),
        ])

      const occupied = occupiedSeats.success ? occupiedSeats.data : 0
      return {
        organization,
        role: row.role,
        activeSeats: activeSeats.success ? activeSeats.data : 0,
        occupiedSeats: occupied,
        availableSeats:
          organization.seat_limit > 0
            ? Math.max(0, organization.seat_limit - occupied)
            : null,
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
          Organization administration
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Manage seats and the reusable access code for your nonprofit. Sponsored
          access is Platinum-equivalent.
        </p>
      </div>

      {details.filter(Boolean).map((detail) => {
        if (!detail) {
          return null
        }
        const {
          organization,
          activeSeats,
          occupiedSeats,
          availableSeats,
          members,
          code,
        } = detail
        return (
          <Card key={organization.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="font-display text-lg font-medium">
                {organization.name}
              </CardTitle>
              <Badge variant="outline">{organization.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-ink-soft">
              <p>
                <span className="font-semibold text-ink">Sponsored access level:</span>{" "}
                Platinum-equivalent
              </p>
              <p>
                <span className="font-semibold text-ink">Seats:</span> {occupiedSeats}{" "}
                / {organization.seat_limit || "unlimited"}
                {availableSeats !== null ? ` · ${availableSeats} available` : ""}
                {" · "}
                {activeSeats} active ·{" "}
                {members.filter((m) => m.status === "suspended").length} suspended
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
      })}
    </div>
  )
}
