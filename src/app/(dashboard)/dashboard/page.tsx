import { getCurrentProfile, getCurrentUser } from "@/features/auth/services/auth.service"
import { DashboardHomeActions } from "@/features/dashboard/components/dashboard-home-actions"

export default async function DashboardPage() {
  const [userResult, profileResult] = await Promise.all([
    getCurrentUser(),
    getCurrentProfile(),
  ])

  if (!userResult.success || !profileResult.success) {
    return null
  }

  const { data: user } = userResult
  const { data: profile } = profileResult
  const displayName = profile.fullName?.trim() || user.email

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-[28px] font-medium text-ink">My dashboard</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Welcome back, {displayName}. Keep your momentum going.
        </p>
      </div>

      <DashboardHomeActions />
    </div>
  )
}
