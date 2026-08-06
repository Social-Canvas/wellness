/**
 * Canonical Autoimmune Masterclass video ↔ lesson mapping.
 * Source filenames only — no invented curriculum.
 */

export const AUTOIMMUNE_COURSE_SLUG = "autoimmune-masterclass" as const

export type AutoimmuneVideoKey =
  | "intro"
  | "day-1"
  | "day-2"
  | "day-3"
  | "day-4"
  | "day-5"

export type AutoimmuneVideoMapping = {
  key: AutoimmuneVideoKey
  lessonSlug: string
  title: string
  sortOrder: number
  patterns: RegExp[]
}

export const AUTOIMMUNE_VIDEO_MAPPINGS: readonly AutoimmuneVideoMapping[] = [
  {
    key: "intro",
    lessonSlug: "intro",
    title: "Intro to Autoimmune",
    sortOrder: 0,
    patterns: [/^intro\s+to\s+autoimmune\.mp4$/i],
  },
  {
    key: "day-1",
    lessonSlug: "lesson-01",
    title: "Masterclass Day 1",
    sortOrder: 1,
    patterns: [/^masterclass_day1_autoimmune\.mp4$/i],
  },
  {
    key: "day-2",
    lessonSlug: "lesson-02",
    title: "Masterclass Day 2",
    sortOrder: 2,
    patterns: [/^masterclass_day2_autoimmune\.mp4$/i],
  },
  {
    key: "day-3",
    lessonSlug: "lesson-03",
    title: "Day 3 Inflammation",
    sortOrder: 3,
    patterns: [/^day\s*3[_\s-]*inflammation\.mp4$/i],
  },
  {
    key: "day-4",
    lessonSlug: "lesson-04",
    title: "Day 4 Gut Health",
    sortOrder: 4,
    patterns: [/^day\s*4[_\s-]*gut\s*health\.mp4$/i],
  },
  {
    key: "day-5",
    lessonSlug: "lesson-05",
    title: "Day 5 Hormonal Imbalance",
    sortOrder: 5,
    patterns: [/^day\s*5[_\s-]*hormonal\s*imbalance\.mp4$/i],
  },
] as const

export const AUTOIMMUNE_CANONICAL_TITLES = AUTOIMMUNE_VIDEO_MAPPINGS.map(
  (entry) => entry.title
)

export function matchAutoimmuneVideoFilename(
  filename: string
): AutoimmuneVideoMapping | null {
  for (const entry of AUTOIMMUNE_VIDEO_MAPPINGS) {
    if (entry.patterns.some((pattern) => pattern.test(filename))) {
      return entry
    }
  }

  return null
}

export function inventoryAutoimmuneVideos(filenames: string[]): {
  matched: Array<AutoimmuneVideoMapping & { filename: string }>
  unmatched: string[]
  duplicates: string[]
} {
  const matched: Array<AutoimmuneVideoMapping & { filename: string }> = []
  const unmatched: string[] = []
  const duplicates: string[] = []
  const seenKeys = new Set<AutoimmuneVideoKey>()

  for (const filename of filenames) {
    if (!/\.mp4$/i.test(filename)) {
      continue
    }

    const entry = matchAutoimmuneVideoFilename(filename)
    if (!entry) {
      unmatched.push(filename)
      continue
    }

    if (seenKeys.has(entry.key)) {
      duplicates.push(filename)
      continue
    }

    seenKeys.add(entry.key)
    matched.push({ ...entry, filename })
  }

  return { matched, unmatched, duplicates }
}

export function assertExactAutoimmuneVideoInventory(filenames: string[]): {
  ok: true
  matched: Array<AutoimmuneVideoMapping & { filename: string }>
} | {
  ok: false
  reason: string
} {
  const { matched, unmatched, duplicates } = inventoryAutoimmuneVideos(filenames)

  if (duplicates.length > 0) {
    return { ok: false, reason: `Duplicate video matches: ${duplicates.join(", ")}` }
  }

  if (unmatched.length > 0) {
    return { ok: false, reason: `Unmatched MP4s: ${unmatched.join(", ")}` }
  }

  if (matched.length !== AUTOIMMUNE_VIDEO_MAPPINGS.length) {
    return {
      ok: false,
      reason: `Expected ${AUTOIMMUNE_VIDEO_MAPPINGS.length} videos, got ${matched.length}`,
    }
  }

  return { ok: true, matched }
}

export type MuxAssetReuseCandidate = {
  id: string
  status: string
  playbackId: string | null
  passthrough: string | null
}

export function findReusableAutoimmuneMuxAsset(
  assets: MuxAssetReuseCandidate[],
  lessonKey: AutoimmuneVideoKey,
  existingAssetId?: string | null
): MuxAssetReuseCandidate | null {
  if (existingAssetId) {
    const byId = assets.find(
      (asset) =>
        asset.id === existingAssetId &&
        asset.status === "ready" &&
        Boolean(asset.playbackId)
    )
    if (byId) {
      return byId
    }
  }

  for (const asset of assets) {
    if (asset.status !== "ready" || !asset.playbackId || !asset.passthrough) {
      continue
    }

    try {
      const parsed = JSON.parse(asset.passthrough) as {
        purpose?: string
        lesson_key?: string
      }
      if (
        parsed.purpose === "autoimmune_course" &&
        parsed.lesson_key === lessonKey
      ) {
        return asset
      }
    } catch {
      continue
    }
  }

  return null
}

export function shouldUploadAutoimmuneVideo(
  reusable: MuxAssetReuseCandidate | null
): boolean {
  return reusable === null
}

export function dryRunAllowlistCounts(input: {
  selectedVideos: number
  selectedLessons: number
  resourcesSelected?: number
  resetVideosSelected?: number
  membershipRecordingsSelected?: number
  testimonialsSelected?: number
  databaseMutations?: number
  muxMutations?: number
}): { ok: boolean; failures: string[] } {
  const expected = {
    selectedVideos: 6,
    selectedLessons: 6,
    resourcesSelected: 0,
    resetVideosSelected: 0,
    membershipRecordingsSelected: 0,
    testimonialsSelected: 0,
    databaseMutations: 0,
    muxMutations: 0,
  }

  const actual = {
    selectedVideos: input.selectedVideos,
    selectedLessons: input.selectedLessons,
    resourcesSelected: input.resourcesSelected ?? 0,
    resetVideosSelected: input.resetVideosSelected ?? 0,
    membershipRecordingsSelected: input.membershipRecordingsSelected ?? 0,
    testimonialsSelected: input.testimonialsSelected ?? 0,
    databaseMutations: input.databaseMutations ?? 0,
    muxMutations: input.muxMutations ?? 0,
  }

  const failures: string[] = []
  for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
    if (actual[key] !== expected[key]) {
      failures.push(`${key}: expected ${expected[key]}, got ${actual[key]}`)
    }
  }

  return { ok: failures.length === 0, failures }
}

export function lessonVideoAvailabilityLabel(input: {
  hasPlayableVideo: boolean
  processing?: boolean
  failed?: boolean
}): "video" | "processing" | "error" | "no_video" {
  if (input.failed) {
    return "error"
  }
  if (input.processing) {
    return "processing"
  }
  if (input.hasPlayableVideo) {
    return "video"
  }
  return "no_video"
}
