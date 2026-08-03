import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { LibraryPageHeader } from "@/features/content/components"
import { RecordedSessionDetailView } from "@/features/recorded-sessions/components"
import {
  getPublishedRecordedSessionForMember,
  listPublishedRecordedSessionsForMember,
} from "@/features/recorded-sessions/services/recorded-sessions.service"
import { buildSessionNavigation } from "@/features/recorded-sessions/utils/recorded-sessions"

interface RecordedSessionDetailPageProps {
  params: Promise<{ sessionId: string }>
}

export async function generateMetadata({
  params,
}: RecordedSessionDetailPageProps): Promise<Metadata> {
  const profileResult = await getCurrentProfile()
  if (!profileResult.success) return { title: "Recorded Session" }

  const { sessionId } = await params
  const result = await getPublishedRecordedSessionForMember(
    profileResult.data.id,
    sessionId
  )
  if (!result.success) return { title: "Recorded Session" }
  return {
    title: result.data.title,
    description: result.data.shortDescription ?? undefined,
  }
}

export default async function RecordedSessionDetailPage({
  params,
}: RecordedSessionDetailPageProps) {
  const profileResult = await getCurrentProfile()
  if (!profileResult.success) redirect("/login")

  const { sessionId } = await params
  const [sessionResult, listResult] = await Promise.all([
    getPublishedRecordedSessionForMember(profileResult.data.id, sessionId),
    listPublishedRecordedSessionsForMember(profileResult.data.id),
  ])

  if (!sessionResult.success) {
    if (
      sessionResult.error.code === "not_found" ||
      sessionResult.error.code === "entitlement_required"
    ) {
      notFound()
    }

    return (
      <div className="mt-9 space-y-6">
        <LibraryPageHeader
          breadcrumb={[{ label: "Recorded Sessions", href: "/dashboard/recorded-sessions" }, { label: "Session" }]}
          title="Recorded Session"
        />
        <div className="rounded-2xl border border-line bg-surface px-6 py-6">
          <p className="text-sm text-destructive">{sessionResult.error.message}</p>
        </div>
      </div>
    )
  }

  const navigation = buildSessionNavigation(
    listResult.success ? listResult.data : [],
    sessionResult.data.id
  )

  return (
    <RecordedSessionDetailView
      session={sessionResult.data}
      previous={navigation.previous}
      next={navigation.next}
    />
  )
}
