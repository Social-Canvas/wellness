import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { Badge } from "@/components/ui"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  countActiveOrganizationSeats,
  countOccupiedOrganizationSeats,
} from "@/server/services/membership.service"
import type { SupabaseClient } from "@supabase/supabase-js"

export const metadata: Metadata = {
  title: "Nonprofit administration",
  description: "Manage nonprofit partnership seats and members.",
}

function membershipDb(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient
}

export default async function NonprofitAdminPage() {
  const profileResult = await getCurrentProfile()

  if (!profileResult.success) {
    redirect("/login")
  }

  if (profileResult.data.role !== "admin" && profileResult.data.role !== "super_admin") {
    redirect("/dashboard")
  }

  const supabase = membershipDb()
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, status, seat_limit, access_model, plan_id")
    .order("created_at", { ascending: false })
    .limit(20)

  const orgs = (organizations ?? []) as Array<{
    id: string
    name: string
    status: string
    seat_limit: number
    access_model: string
  }>

  const orgDetails = await Promise.all(
    orgs.map(async (organization) => {
      const [activeSeats, occupiedSeats, membersResult] = await Promise.all([
        countActiveOrganizationSeats(organization.id),
        countOccupiedOrganizationSeats(organization.id),
        supabase
          .from("organization_members")
          .select("id, email, role, status, assigned_plan_id")
          .eq("organization_id", organization.id)
          .neq("status", "removed")
          .order("created_at", { ascending: false })
          .limit(50),
      ])

      return {
        organization,
        activeSeats: activeSeats.success ? activeSeats.data : 0,
        occupiedSeats: occupiedSeats.success ? occupiedSeats.data : 0,
        members: (membersResult.data ?? []) as Array<{
          id: string
          email: string
          role: string
          status: string
        }>,
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
          Review nonprofit partnership contracts, seat limits, and member status.
          Invite, suspend, and remove actions are enforced server-side.
        </p>
      </div>

      {orgDetails.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-ink-soft">
            No nonprofit organizations are configured yet. Create organization
            records through a reviewed admin workflow after contracts are signed.
          </CardContent>
        </Card>
      ) : (
        orgDetails.map(({ organization, activeSeats, occupiedSeats, members }) => (
          <Card key={organization.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="font-display text-lg font-medium">
                {organization.name}
              </CardTitle>
              <Badge variant="outline">{organization.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-ink-soft">
              <p>
                <span className="font-semibold text-ink">Access model:</span>{" "}
                {organization.access_model.replaceAll("_", " ")}
              </p>
              <p>
                <span className="font-semibold text-ink">Seats:</span> {activeSeats}{" "}
                active / {occupiedSeats} occupied (incl. invitations) /{" "}
                {organization.seat_limit || "unlimited"} limit
              </p>
              {members.length === 0 ? (
                <p className="text-xs">No members or pending invitations yet.</p>
              ) : (
                <ul className="space-y-2">
                  {members.map((member) => (
                    <li
                      key={member.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2"
                    >
                      <span>
                        <span className="font-semibold text-ink">{member.email}</span>
                        <span className="ml-2 text-xs">({member.role})</span>
                      </span>
                      <Badge variant="outline">{member.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
