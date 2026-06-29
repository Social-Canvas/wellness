import Link from "next/link"

import { getCurrentProfile, getCurrentUser } from "@/features/auth/services/auth.service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"

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

  return (
    <div className="mt-9 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg font-medium">
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-ink-soft">
          <p>
            <span className="font-semibold text-ink">Name:</span>{" "}
            {profile.fullName ?? "Not set"}
          </p>
          <p>
            <span className="font-semibold text-ink">Email:</span> {user.email}
          </p>
          <p>
            <span className="font-semibold text-ink">Role:</span> {user.role}
          </p>
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-dashed border-line bg-cream2/50 px-6 py-10 text-center">
        <p className="font-display text-lg font-medium text-ink">
          Your programs and progress will appear here.
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Membership content and tracking are coming in the next sprints.
        </p>
        <p className="mt-5">
          <Link
            href="/dashboard/library"
            className="font-semibold text-blue hover:text-blue-deep"
          >
            Browse your library
          </Link>
        </p>
      </div>
    </div>
  )
}
