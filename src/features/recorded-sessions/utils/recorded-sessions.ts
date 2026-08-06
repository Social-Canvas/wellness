import type {
  RecordedSessionFilters,
  RecordedSessionFocus,
  RecordedSessionListItem,
} from "@/features/recorded-sessions/types"

/** Mux readiness required before a session may be published to members. */
export function canPublishRecordedSession(input: {
  processingStatus: string
  muxPlaybackId: string | null | undefined
}): boolean {
  const playback = input.muxPlaybackId?.trim() ?? ""
  if (!playback) return false
  return (
    input.processingStatus === "ready" || input.processingStatus === "published"
  )
}

export function isRecordedSessionMemberVisible(input: {
  publicationStatus: string
  processingStatus: string
  muxPlaybackId: string | null | undefined
}): boolean {
  return (
    input.publicationStatus === "published" &&
    canPublishRecordedSession(input)
  )
}

/** Reset-only / ebook-only product grants must never imply session access. */
export function productGrantImpliesRecordedSessions(input: {
  hasActiveMembershipCapability: boolean
  hasResetProductOnly: boolean
  hasEbookProductOnly: boolean
}): boolean {
  if (input.hasActiveMembershipCapability) return true
  if (input.hasResetProductOnly || input.hasEbookProductOnly) return false
  return false
}

export function slugifyRecordedSessionTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
}

export function humanizeLocalMediaBasename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "")
  return base
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Curriculum planning examples for validation only.
 * Never auto-publish unrecorded spreadsheet rows.
 */
export const CURRICULUM_PLANNING_EXAMPLES = [
  {
    monthlyTheme: "Nervous System Safety",
    weekNumber: 1,
    weeklyTopic: "Landing in the body",
    focus: "awareness" as const,
    recorded: false,
  },
  {
    monthlyTheme: "Nervous System Safety",
    weekNumber: 2,
    weeklyTopic: "Softening stored tension",
    focus: "release" as const,
    recorded: false,
  },
  {
    monthlyTheme: "Nervous System Safety",
    weekNumber: 3,
    weeklyTopic: "Embodied regulation",
    focus: "embodiment" as const,
    recorded: false,
  },
  {
    monthlyTheme: "Nervous System Safety",
    weekNumber: 4,
    weeklyTopic: "Integrating the week",
    focus: "integration" as const,
    recorded: false,
  },
] as const

export function shouldPublishCurriculumPlanRow(row: {
  recorded: boolean
  hasMuxPlayback: boolean
}): boolean {
  return row.recorded && row.hasMuxPlayback
}

export function filterRecordedSessions(
  sessions: RecordedSessionListItem[],
  filters: RecordedSessionFilters
): RecordedSessionListItem[] {
  const theme = filters.theme?.trim().toLowerCase() ?? ""
  const search = filters.search?.trim().toLowerCase() ?? ""
  const focus = filters.focus ?? null
  const year = filters.year ?? null

  return sessions.filter((session) => {
    if (theme) {
      const sessionTheme = session.monthlyTheme?.toLowerCase() ?? ""
      if (!sessionTheme.includes(theme)) return false
    }

    if (focus && session.focus !== focus) return false

    if (year !== null) {
      if (!session.recordedAt) return false
      const sessionYear = Number(session.recordedAt.slice(0, 4))
      if (sessionYear !== year) return false
    }

    if (search) {
      const haystack = [
        session.title,
        session.shortDescription,
        session.monthlyTheme,
        session.weeklyTopic,
        session.presenter,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      if (!haystack.includes(search)) return false
    }

    return true
  })
}

export function shouldShowArchiveFilters(
  sessions: RecordedSessionListItem[]
): boolean {
  if (sessions.length < 4) return false
  const themes = new Set(
    sessions.map((s) => s.monthlyTheme).filter(Boolean) as string[]
  )
  const focuses = new Set(
    sessions.map((s) => s.focus).filter(Boolean) as RecordedSessionFocus[]
  )
  const years = new Set(
    sessions
      .map((s) => (s.recordedAt ? Number(s.recordedAt.slice(0, 4)) : null))
      .filter((y): y is number => y !== null)
  )
  return themes.size > 1 || focuses.size > 1 || years.size > 1
}

export function sortRecordedSessionsNewestFirst(
  sessions: RecordedSessionListItem[]
): RecordedSessionListItem[] {
  return [...sessions].sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder
    }
    const aDate = a.recordedAt ?? a.publishedAt ?? ""
    const bDate = b.recordedAt ?? b.publishedAt ?? ""
    if (aDate !== bDate) return bDate.localeCompare(aDate)
    return a.title.localeCompare(b.title)
  })
}

export function buildSessionNavigation(
  sessions: RecordedSessionListItem[],
  currentId: string
): {
  previous: RecordedSessionListItem | null
  next: RecordedSessionListItem | null
} {
  const ordered = sortRecordedSessionsNewestFirst(sessions)
  const index = ordered.findIndex((session) => session.id === currentId)
  if (index < 0) {
    return { previous: null, next: null }
  }
  // Newest-first list: previous = newer (lower index), next = older (higher index)
  return {
    previous: index > 0 ? ordered[index - 1]! : null,
    next: index < ordered.length - 1 ? ordered[index + 1]! : null,
  }
}

/**
 * Identity keys for local inventory matching only.
 * Curriculum theme/week/topic/focus intentionally omitted.
 */
export const LOCAL_SESSION_INVENTORY_KEYS = [
  {
    key: "inner-child-healing",
    filenamePatterns: [/inner[_\s-]?child[_\s-]?healing\.mp4$/i],
    provisionalTitle: "Inner Child Healing",
  },
  {
    key: "manifestation-breathwork",
    filenamePatterns: [/manifestation[_\s-]?breathwork\.mp4$/i],
    provisionalTitle: "Manifestation Breathwork",
  },
  {
    key: "trauma-healing",
    filenamePatterns: [/trauma[_\s-]?hea(?:l)?ing\.mp4$/i],
    provisionalTitle: "Trauma Healing",
  },
  {
    key: "visualization-alignment",
    filenamePatterns: [/visualization[_\s-]*alignment\.mp4$/i],
    provisionalTitle: "Visualization",
  },
  {
    key: "activate-money-mindset",
    filenamePatterns: [/activate[_\s-]?money[_\s-]?mindset\.mp4$/i],
    provisionalTitle: "Activate Money Mindset",
  },
] as const

export function matchInventoryKeyForFilename(
  filename: string
): (typeof LOCAL_SESSION_INVENTORY_KEYS)[number] | null {
  const base = filename.split("/").pop() ?? filename
  for (const entry of LOCAL_SESSION_INVENTORY_KEYS) {
    if (entry.filenamePatterns.some((pattern) => pattern.test(base))) {
      return entry
    }
  }
  return null
}

/** Duration match tolerance (seconds) when linking existing Mux assets. */
export const MUX_DURATION_MATCH_TOLERANCE_SECONDS = 45

export function findDurationMatch<T extends { duration: number | null | undefined }>(
  candidates: T[],
  targetSeconds: number,
  tolerance = MUX_DURATION_MATCH_TOLERANCE_SECONDS
): T | null {
  let best: T | null = null
  let bestDelta = Number.POSITIVE_INFINITY
  for (const candidate of candidates) {
    if (typeof candidate.duration !== "number") continue
    const delta = Math.abs(candidate.duration - targetSeconds)
    if (delta <= tolerance && delta < bestDelta) {
      best = candidate
      bestDelta = delta
    }
  }
  return best
}

export function formatFocusLabel(focus: RecordedSessionFocus | null): string | null {
  if (!focus) return null
  return focus.charAt(0).toUpperCase() + focus.slice(1)
}
