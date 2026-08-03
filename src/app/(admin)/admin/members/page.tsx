import { getCurrentUser } from "@/features/auth/services/auth.service"
import { MembersTable } from "@/features/members/components"
import { listMembers } from "@/features/members/services/members.service"

export default async function AdminMembersPage() {
  const [membersResult, actorResult] = await Promise.all([listMembers(), getCurrentUser()])

  if (!membersResult.success) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-[28px] font-medium text-ink">Members</h2>
          <p className="mt-1 text-sm text-ink-soft">
            View member accounts and manage platform roles.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{membersResult.error.message}</p>
        </div>
      </div>
    )
  }

  const canManageRoles = actorResult.success && actorResult.data.role === "super_admin"
  const canCorrectCertificateNames =
    actorResult.success &&
    (actorResult.data.role === "admin" || actorResult.data.role === "super_admin")

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[28px] font-medium text-ink">Members</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {canManageRoles
            ? "View member accounts, update roles, and apply audited certificate-name corrections. Super admins cannot change their own role."
            : canCorrectCertificateNames
              ? "View member accounts and apply audited certificate-name corrections. Only super admins can change roles."
              : "View member accounts. Only super admins can change roles."}
        </p>
      </div>

      <MembersTable
        members={membersResult.data}
        canManageRoles={canManageRoles}
        canCorrectCertificateNames={canCorrectCertificateNames}
        currentProfileId={actorResult.success ? actorResult.data.id : ""}
      />
    </div>
  )
}
