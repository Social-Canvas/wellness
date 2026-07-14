// Pure, dependency-free selection logic for the reset media migration script.
//
// This module contains no Mux/Supabase/FS access on purpose so the allowlist
// rules can be unit tested in isolation. scripts/reset-media-migrate.mjs uses
// selectLessons() to decide which canonical lessons enter the processing loop.
// Every Mux upload and Supabase write happens inside that loop, so any lesson
// excluded here provably receives zero Mux/Supabase calls.

/** Split a raw --only value into trimmed, non-empty identifiers. */
export function parseOnlyIds(rawOnly) {
  if (typeof rawOnly !== "string") return []
  return rawOnly
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
}

/**
 * Resolve the exact set of canonical lessons to process.
 *
 * - `--only key1,key2` selects an explicit allowlisted subset. Unknown and
 *   duplicate identifiers are rejected before any mutation.
 * - `--lesson-key key` selects a single lesson (legacy single-item retry).
 * - Neither flag selects every canonical lesson (the full 22-item migration).
 *
 * `--only` and `--lesson-key` are mutually exclusive. Selection preserves
 * canonical ordering.
 */
export function selectLessons(canonicalLessons, options = {}) {
  const { only = "", lessonKey = "" } = options
  const onlyIds = parseOnlyIds(only)
  const hasOnly = typeof only === "string" && only.trim().length > 0
  const hasLessonKey = typeof lessonKey === "string" && lessonKey.trim().length > 0

  if (hasOnly && hasLessonKey) {
    throw new Error("Provide either --only or --lesson-key, not both.")
  }

  const canonicalByKey = new Map(canonicalLessons.map((lesson) => [lesson.key, lesson]))

  if (hasOnly) {
    if (onlyIds.length === 0) {
      throw new Error("--only was provided but contained no identifiers.")
    }

    const seen = new Set()
    const duplicates = []
    const unknown = []
    for (const id of onlyIds) {
      if (seen.has(id)) {
        duplicates.push(id)
        continue
      }
      seen.add(id)
      if (!canonicalByKey.has(id)) {
        unknown.push(id)
      }
    }

    if (unknown.length > 0) {
      throw new Error(`--only includes unknown identifiers: ${unknown.join(", ")}`)
    }
    if (duplicates.length > 0) {
      throw new Error(`--only includes duplicate identifiers: ${duplicates.join(", ")}`)
    }

    return canonicalLessons.filter((lesson) => seen.has(lesson.key))
  }

  if (hasLessonKey) {
    const trimmedKey = lessonKey.trim()
    const found = canonicalLessons.filter((lesson) => lesson.key === trimmedKey)
    if (found.length === 0) {
      throw new Error(`Unknown --lesson-key "${lessonKey}"`)
    }
    return found
  }

  return canonicalLessons.slice()
}
