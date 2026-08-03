import Link from "next/link"

import { Badge, buttonVariants } from "@/components/ui"
import { LibraryBreadcrumb } from "@/features/content/components/LibraryPageHeader"
import { formatDuration } from "@/features/content/utils/format-duration"
import { SecureRecordedSessionPlayer } from "@/features/recorded-sessions/components/SecureRecordedSessionPlayer"
import type { RecordedSessionListItem } from "@/features/recorded-sessions/types"
import { formatFocusLabel } from "@/features/recorded-sessions/utils/recorded-sessions"
import { cn } from "@/lib/utils"

interface RecordedSessionDetailViewProps {
  session: {
    id: string
    title: string
    shortDescription: string | null
    recordedAt: string | null
    durationSeconds: number | null
    presenter: string | null
    monthlyTheme: string | null
    weekNumber: number | null
    weeklyTopic: string | null
    focus: RecordedSessionListItem["focus"]
    thumbnailUrl: string | null
  }
  previous: RecordedSessionListItem | null
  next: RecordedSessionListItem | null
}

export function RecordedSessionDetailView({
  session,
  previous,
  next,
}: RecordedSessionDetailViewProps) {
  const focusLabel = formatFocusLabel(session.focus)

  return (
    <div className="mt-9 space-y-8">
      <LibraryBreadcrumb
        items={[
          { label: "Recorded Sessions", href: "/dashboard/recorded-sessions" },
          { label: session.title },
        ]}
      />

      <div className="space-y-3">
        <h1 className="font-display text-3xl font-medium text-ink sm:text-4xl">
          {session.title}
        </h1>
        {session.shortDescription ? (
          <p className="max-w-2xl text-base text-ink-soft">{session.shortDescription}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {session.presenter ? <Badge variant="secondary">{session.presenter}</Badge> : null}
          {session.monthlyTheme ? (
            <Badge variant="outline">{session.monthlyTheme}</Badge>
          ) : null}
          {session.weekNumber ? (
            <Badge variant="outline">Week {session.weekNumber}</Badge>
          ) : null}
          {session.weeklyTopic ? (
            <Badge variant="outline">{session.weeklyTopic}</Badge>
          ) : null}
          {focusLabel ? <Badge variant="outline">{focusLabel}</Badge> : null}
          {session.recordedAt ? (
            <Badge variant="outline">{session.recordedAt}</Badge>
          ) : null}
          <Badge variant="outline">{formatDuration(session.durationSeconds)}</Badge>
        </div>
      </div>

      <SecureRecordedSessionPlayer
        sessionId={session.id}
        title={session.title}
        poster={session.thumbnailUrl}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        {previous ? (
          <Link
            href={`/dashboard/recorded-sessions/${previous.id}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Previous: {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/dashboard/recorded-sessions/${next.id}`}
            className={cn(buttonVariants({ variant: "default" }))}
          >
            Next: {next.title}
          </Link>
        ) : null}
      </div>
    </div>
  )
}
