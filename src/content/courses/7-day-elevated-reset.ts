/**
 * Canonical structure for The 7-Day Elevated Reset course.
 * Database slug: `7-day-reset-meditation-series` (preserves plan content_access).
 *
 * Videos are created in `draft` with `migration_status: not_started` until Mux assets
 * are uploaded and linked in Admin → Videos.
 */

export const SEVEN_DAY_ELEVATED_RESET_COURSE_SLUG = "7-day-reset-meditation-series" as const

export type ResetLessonSlot = {
  moduleSlug: string
  moduleTitle: string
  moduleSortOrder: number
  lessonSlug: string
  lessonTitle: string
  videoTitle: string
  lessonSortOrder: number
  /** GHL / source media label for migration tracking */
  ghlMediaLabel: string
}

export const SEVEN_DAY_ELEVATED_RESET_LESSONS: ResetLessonSlot[] = [
  {
    moduleSlug: "welcome",
    moduleTitle: "Welcome",
    moduleSortOrder: 0,
    lessonSlug: "welcome",
    lessonTitle: "Welcome",
    videoTitle: "7-Day Elevated Reset — Welcome",
    lessonSortOrder: 1,
    ghlMediaLabel: "Welcome lesson/video",
  },
  ...buildDayLessons(1),
  ...buildDayLessons(2),
  ...buildDayLessons(3),
  ...buildDayLessons(4),
  ...buildDayLessons(5),
  ...buildDayLessons(6),
  ...buildDayLessons(7),
]

function buildDayLessons(day: number): ResetLessonSlot[] {
  const moduleSlug = `day-${day}`
  return [
    {
      moduleSlug,
      moduleTitle: `Day ${day}`,
      moduleSortOrder: day,
      lessonSlug: "morning",
      lessonTitle: "Morning Meditation",
      videoTitle: `7-Day Elevated Reset — Day ${day} Morning Meditation`,
      lessonSortOrder: 1,
      ghlMediaLabel: `Day ${day} Morning Meditation`,
    },
    {
      moduleSlug,
      moduleTitle: `Day ${day}`,
      moduleSortOrder: day,
      lessonSlug: "afternoon",
      lessonTitle: "Afternoon Regroup / Refocus",
      videoTitle: `7-Day Elevated Reset — Day ${day} Afternoon Regroup / Refocus`,
      lessonSortOrder: 2,
      ghlMediaLabel: `Day ${day} Afternoon Regroup / Refocus`,
    },
    {
      moduleSlug,
      moduleTitle: `Day ${day}`,
      moduleSortOrder: day,
      lessonSlug: "evening",
      lessonTitle: "Evening Meditation",
      videoTitle: `7-Day Elevated Reset — Day ${day} Evening Meditation`,
      lessonSortOrder: 3,
      ghlMediaLabel: `Day ${day} Evening Meditation`,
    },
  ]
}

/**
 * Remaining media migration steps (manual / follow-up task):
 * 1. Export each GHL video listed in `ghlMediaLabel` above.
 * 2. Upload to Mux via Admin → Videos (direct upload or asset sync).
 * 3. Match each Mux asset to the corresponding `videoTitle` row in `videos`.
 * 4. Set video `status` to `ready` or `published` once Mux webhook confirms playback.
 * 5. Verify playback + resume in dashboard lesson player (desktop + iOS Safari).
 *
 * Do NOT embed Google Drive URLs in the frontend.
 * Quiz, scoring, diet plans, and personalized Reset recommendations are out of scope.
 */
export const SEVEN_DAY_ELEVATED_RESET_MEDIA_MIGRATION_PENDING = true

/** First lesson to validate Mux upload → webhook → playback → progress (E2E). */
export const SEVEN_DAY_ELEVATED_RESET_E2E_LESSON = {
  moduleSlug: "welcome",
  lessonSlug: "welcome",
  videoTitle: "7-Day Elevated Reset — Welcome",
  ghlMediaLabel: "Welcome lesson/video",
} as const

/**
 * Publish gate: keep course / module / lesson in `draft` until the linked video has
 * `mux_playback_id` set and `status` in (`ready`, `published`). See
 * `docs/7-day-elevated-reset-media-checklist.md` for per-lesson status tracking.
 */
export const SEVEN_DAY_ELEVATED_RESET_PUBLISH_REQUIRES_MUX_READY = true
