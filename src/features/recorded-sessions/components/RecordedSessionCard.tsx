import Link from "next/link"

import { Badge, buttonVariants } from "@/components/ui"
import { BrandImage } from "@/components/media"
import { formatDuration } from "@/features/content/utils/format-duration"
import type { RecordedSessionListItem } from "@/features/recorded-sessions/types"
import { formatFocusLabel } from "@/features/recorded-sessions/utils/recorded-sessions"
import { BRAND_IMAGES } from "@/lib/brand/images"
import { cn } from "@/lib/utils"

interface RecordedSessionCardProps {
  session: RecordedSessionListItem
  featured?: boolean
}

export function RecordedSessionCard({
  session,
  featured = false,
}: RecordedSessionCardProps) {
  const thumbnail = session.thumbnailUrl
    ? { src: session.thumbnailUrl, alt: `${session.title} session thumbnail` }
    : BRAND_IMAGES.meditationSession

  const focusLabel = formatFocusLabel(session.focus)
  const metaParts = [
    session.monthlyTheme,
    session.weeklyTopic,
    focusLabel,
    session.recordedAt,
    formatDuration(session.durationSeconds),
  ].filter(Boolean)

  return (
    <article
      className={
        featured
          ? "overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface"
          : "overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface transition-colors hover:border-blue/30 hover:bg-blue-soft/15"
      }
    >
      <div className={featured ? "grid gap-0 lg:grid-cols-[1.2fr_1fr]" : ""}>
        <BrandImage
          image={thumbnail}
          containerClassName={
            featured
              ? "aspect-[16/10] w-full border-b border-line lg:aspect-auto lg:min-h-[18rem] lg:border-b-0 lg:border-r"
              : "aspect-[16/9] w-full border-b border-line"
          }
          sizes={featured ? "(max-width: 1024px) 100vw, 55vw" : "(max-width: 860px) 100vw, 33vw"}
        />
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          {featured ? (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue">
              Latest session
            </p>
          ) : null}
          <div className="space-y-2">
            <h3
              className={
                featured
                  ? "font-display text-2xl font-medium text-ink sm:text-3xl"
                  : "font-display text-xl font-medium text-ink"
              }
            >
              {session.title}
            </h3>
            {session.shortDescription ? (
              <p className="text-sm leading-relaxed text-ink-soft line-clamp-3">
                {session.shortDescription}
              </p>
            ) : null}
          </div>
          {metaParts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {session.monthlyTheme ? (
                <Badge variant="secondary">{session.monthlyTheme}</Badge>
              ) : null}
              {session.weeklyTopic ? (
                <Badge variant="outline">{session.weeklyTopic}</Badge>
              ) : null}
              {focusLabel ? <Badge variant="outline">{focusLabel}</Badge> : null}
              {session.recordedAt ? (
                <Badge variant="outline">{session.recordedAt}</Badge>
              ) : null}
              <Badge variant="outline">
                {formatDuration(session.durationSeconds)}
              </Badge>
            </div>
          ) : null}
          <div className="mt-auto">
            <Link
              href={`/dashboard/recorded-sessions/${session.id}`}
              className={cn(buttonVariants({ variant: "default" }))}
            >
              Watch
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}
