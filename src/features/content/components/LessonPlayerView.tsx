"use client"

import { useState } from "react"

import { Badge } from "@/components/ui"
import { LibraryBreadcrumb } from "@/features/content/components/LibraryPageHeader"
import { LessonCourseOutline } from "@/features/content/components/LessonCourseOutline"
import { LessonNavigationControls } from "@/features/content/components/LessonNavigationControls"
import { formatDuration } from "@/features/content/utils/format-duration"
import {
  buildLessonContextLine,
  deriveLessonHeadline,
} from "@/features/content/utils/lesson-display"
import {
  resolveCourseHref,
  resolveLessonHref,
  type LessonNavigationModel,
} from "@/features/content/utils/lesson-navigation"
import { resolvePosterUrl } from "@/features/content/utils/poster-url"
import type { LibraryLessonDetail, LibraryModule } from "@/features/content/types"
import {
  LessonCompletionBadge,
  ProgressTrackedMuxPlayer,
} from "@/features/progress/components"

interface LessonPlayerViewProps {
  lesson: LibraryLessonDetail
  modules: LibraryModule[]
  navigation: LessonNavigationModel
}

export function LessonPlayerView({
  lesson,
  modules,
  navigation,
}: LessonPlayerViewProps) {
  const [emphasizeComplete, setEmphasizeComplete] = useState(false)
  const preview = lesson.preview
  const courseHref = resolveCourseHref(lesson.courseId, preview)
  const headline = deriveLessonHeadline(lesson.title, lesson.module.title)
  const contextLine = buildLessonContextLine({
    moduleTitle: lesson.module.title,
    currentIndex: navigation.currentIndex,
    availableCount: navigation.availableCount,
    isAvailable: lesson.isAvailable,
  })

  const outlineModules = modules.map((module) => ({
    id: module.id,
    title: module.title,
    lessons: navigation.outline.filter((entry) => entry.moduleId === module.id),
  }))

  const previousHref = navigation.previous
    ? resolveLessonHref(lesson.courseId, navigation.previous.id, preview)
    : null
  const nextHref = navigation.next
    ? resolveLessonHref(lesson.courseId, navigation.next.id, preview)
    : null

  const poster = resolvePosterUrl(lesson.video?.thumbnailUrl)
  const video = lesson.video

  return (
    <div className="mt-9 space-y-6">
      {preview ? (
        <div className="rounded-2xl border border-blue/30 bg-blue-soft/20 px-4 py-3 text-sm text-ink">
          <span className="font-semibold text-blue">Preview mode</span> · Viewing
          unpublished draft content.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,28%)] lg:items-start">
        <div className="min-w-0 space-y-5">
          <div className="space-y-3">
            <LibraryBreadcrumb
              items={[
                { label: "Library", href: "/dashboard/library" },
                { label: lesson.course.title, href: courseHref },
                { label: lesson.module.title },
              ]}
            />
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="font-display text-[28px] font-medium text-ink">
                  {headline}
                </h1>
                <p className="mt-1 text-sm text-ink-soft">{contextLine}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {lesson.isRequired ? <Badge variant="plan">Required</Badge> : null}
                {lesson.isAvailable ? (
                  <LessonCompletionBadge isCompleted={lesson.isCompleted} />
                ) : (
                  <Badge variant="outline">Coming soon</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="lg:hidden">
            <LessonCourseOutline
              courseId={lesson.courseId}
              courseTitle={lesson.course.title}
              modules={outlineModules}
              currentLessonId={lesson.id}
              preview={preview}
              availableCount={navigation.availableCount}
              completedAvailableCount={navigation.completedAvailableCount}
              comingSoonCount={navigation.comingSoonCount}
              collapsible
            />
          </div>

          {lesson.isAvailable ? (
            <div className="space-y-4">
              {video ? (
                <div className="mx-auto w-full max-w-4xl">
                  <ProgressTrackedMuxPlayer
                    videoId={video.id}
                    lessonId={lesson.id}
                    title={video.title}
                    poster={poster}
                    startTimeSeconds={
                      lesson.videoProgress?.lastPositionSeconds ?? 0
                    }
                    isCompleted={lesson.isCompleted}
                    onEnded={() => setEmphasizeComplete(true)}
                  />
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                        Duration
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-ink">
                        {formatDuration(video.durationSeconds)}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-line bg-cream2/40 px-4 py-8 text-center text-sm text-ink-soft">
                  No video attached to this lesson yet.
                </p>
              )}

              {lesson.description ? (
                <p className="text-sm leading-relaxed text-ink-soft">
                  {lesson.description}
                </p>
              ) : null}

              <LessonNavigationControls
                courseId={lesson.courseId}
                lessonId={lesson.id}
                videoId={video?.id ?? null}
                isCompleted={lesson.isCompleted}
                isAvailable={lesson.isAvailable}
                preview={preview}
                previous={navigation.previous}
                next={navigation.next}
                previousHref={previousHref}
                nextHref={nextHref}
                emphasizeComplete={emphasizeComplete}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-dashed border-line bg-cream2/40 px-6 py-10 text-center">
                <p className="font-display text-lg font-medium text-ink">
                  Media not available yet
                </p>
                <p className="mt-2 text-sm text-ink-soft">
                  This lesson is still in draft. Video playback will be enabled once
                  the lesson is published.
                </p>
              </div>
              <LessonNavigationControls
                courseId={lesson.courseId}
                lessonId={lesson.id}
                videoId={null}
                isCompleted={false}
                isAvailable={false}
                preview={preview}
                previous={navigation.previous}
                next={navigation.next}
                previousHref={previousHref}
                nextHref={nextHref}
              />
            </div>
          )}
        </div>

        <div className="hidden lg:block">
          <LessonCourseOutline
            courseId={lesson.courseId}
            courseTitle={lesson.course.title}
            modules={outlineModules}
            currentLessonId={lesson.id}
            preview={preview}
            availableCount={navigation.availableCount}
            completedAvailableCount={navigation.completedAvailableCount}
            comingSoonCount={navigation.comingSoonCount}
          />
        </div>
      </div>
    </div>
  )
}
