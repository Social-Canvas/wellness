#!/usr/bin/env node

import { accessSync, existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { createClient } from "@supabase/supabase-js"

const COURSE_SLUG = "7-day-reset-meditation-series"
const STAND_IN_WELCOME_PLAYBACK_ID = "cevtQPbDchk4Foe666xyBV2KUyp7xbQSPhtFCMc7Kv4"

const REQUIRED_INVENTORY_COLUMNS = [
  "module",
  "lesson",
  "manifest key",
  "source type",
  "GHL/Drive source URL",
  "source filename",
  "local video title",
  "video id (from DB if known)",
  "download status",
  "Mux upload status",
  "Mux asset ID",
  "playback ID",
  "attachment status",
  "publish status",
  "verification notes",
]

function buildCanonicalLessons() {
  const lessons = [
    {
      key: "welcome",
      moduleSlug: "welcome",
      lessonSlug: "welcome",
      videoTitle: "7-Day Elevated Reset — Welcome",
      isWelcome: true,
    },
  ]

  for (let day = 1; day <= 7; day += 1) {
    lessons.push(
      {
        key: `day${day}_morning`,
        moduleSlug: `day-${day}`,
        lessonSlug: "morning",
        videoTitle: `7-Day Elevated Reset — Day ${day} Morning Meditation`,
        isWelcome: false,
      },
      {
        key: `day${day}_afternoon`,
        moduleSlug: `day-${day}`,
        lessonSlug: "afternoon",
        videoTitle: `7-Day Elevated Reset — Day ${day} Afternoon Regroup / Refocus`,
        isWelcome: false,
      },
      {
        key: `day${day}_evening`,
        moduleSlug: `day-${day}`,
        lessonSlug: "evening",
        videoTitle: `7-Day Elevated Reset — Day ${day} Evening Meditation`,
        isWelcome: false,
      },
    )
  }

  return lessons
}

function parseArgValue(name, fallback = "") {
  const index = process.argv.indexOf(name)
  if (index === -1 || index + 1 >= process.argv.length) return fallback
  return process.argv[index + 1]
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, "utf8"))
}

function parseDotEnv(pathname) {
  const env = {}
  const content = readFileSync(pathname, "utf8")
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const idx = line.indexOf("=")
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "")
    env[key] = value
  }
  return env
}

function splitCsvLine(line) {
  const values = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === "," && !inQuotes) {
      values.push(current)
      current = ""
      continue
    }
    current += char
  }
  values.push(current)
  return values
}

function parseCsv(pathname) {
  const raw = readFileSync(pathname, "utf8")
  const lines = raw.split(/\r?\n/).filter((line) => line.length > 0)
  if (lines.length === 0) return { header: [], rows: [] }
  const header = splitCsvLine(lines[0]).map((column) => column.trim())
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line)
    const row = {}
    header.forEach((column, index) => {
      row[column] = (values[index] ?? "").trim()
    })
    return row
  })
  return { header, rows }
}

function assertFileReadable(pathname) {
  accessSync(pathname)
}

function normalizeManifestSource(value) {
  if (typeof value !== "string") return ""
  const trimmed = value.trim()
  if (!trimmed || trimmed.toUpperCase() === "TBD") return ""
  return trimmed
}

function makeLessonIndex(lessons) {
  const map = new Map()
  for (const lesson of lessons) {
    map.set(`${lesson.moduleSlug}/${lesson.lessonSlug}`, lesson)
  }
  return map
}

function validateInventory(inventoryPath) {
  if (!existsSync(inventoryPath)) {
    throw new Error(`Inventory CSV not found: ${inventoryPath}`)
  }

  const canonical = buildCanonicalLessons()
  const canonicalIndex = makeLessonIndex(canonical)
  const { header, rows } = parseCsv(inventoryPath)

  const missingColumns = REQUIRED_INVENTORY_COLUMNS.filter((column) => !header.includes(column))
  const seenSlots = new Set()
  const unknownRows = []

  for (const row of rows) {
    const slot = `${row.module}/${row.lesson}`
    seenSlots.add(slot)
    if (!canonicalIndex.has(slot)) {
      unknownRows.push(slot)
    }
  }

  const missingRows = canonical
    .map((lesson) => `${lesson.moduleSlug}/${lesson.lessonSlug}`)
    .filter((slot) => !seenSlots.has(slot))

  const duplicateSlots = []
  const slotCounts = new Map()
  for (const row of rows) {
    const slot = `${row.module}/${row.lesson}`
    slotCounts.set(slot, (slotCounts.get(slot) ?? 0) + 1)
  }
  for (const [slot, count] of slotCounts.entries()) {
    if (count > 1) duplicateSlots.push(slot)
  }

  const welcomeRow = rows.find((row) => row.module === "welcome" && row.lesson === "welcome")
  const welcomeStandInFlagged =
    welcomeRow &&
    (welcomeRow["Mux upload status"] || "").includes("stand_in_uploaded_replace_before_launch") &&
    (welcomeRow["verification notes"] || "").toLowerCase().includes("replace before launch")

  return {
    inventoryPath,
    totalRows: rows.length,
    expectedRows: canonical.length,
    missingColumns,
    missingRows,
    duplicateSlots,
    unknownRows,
    welcomeStandInFlagged: Boolean(welcomeStandInFlagged),
    ok:
      missingColumns.length === 0 &&
      missingRows.length === 0 &&
      duplicateSlots.length === 0 &&
      unknownRows.length === 0 &&
      Boolean(welcomeStandInFlagged),
  }
}

function missingFiles(manifestPath) {
  if (!existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`)
  }

  const manifest = readJson(manifestPath)
  const canonical = buildCanonicalLessons()
  const missingManifestKeys = []
  const missingSource = []
  const invalidLocalPaths = []
  const invalidUrls = []
  const sourceConflicts = []

  if (manifest.courseSlug !== COURSE_SLUG) {
    throw new Error(`Manifest courseSlug must be "${COURSE_SLUG}".`)
  }

  for (const lesson of canonical) {
    const entry = manifest.lessons?.[lesson.key]
    if (!entry) {
      missingManifestKeys.push(lesson.key)
      continue
    }

    const localPath = normalizeManifestSource(entry.localPath)
    const driveUrl = normalizeManifestSource(entry.driveUrl)
    if (!localPath && !driveUrl) {
      missingSource.push(lesson.key)
      continue
    }
    if (localPath && driveUrl) {
      sourceConflicts.push(lesson.key)
      continue
    }
    if (localPath) {
      const absolutePath = resolve(process.cwd(), localPath)
      try {
        assertFileReadable(absolutePath)
      } catch {
        invalidLocalPaths.push({ key: lesson.key, localPath, absolutePath })
      }
    }
    if (driveUrl && !/^https?:\/\//i.test(driveUrl)) {
      invalidUrls.push({ key: lesson.key, driveUrl })
    }
  }

  return {
    manifestPath,
    totalExpected: canonical.length,
    missingManifestKeys,
    missingSource,
    sourceConflicts,
    invalidLocalPaths,
    invalidUrls,
  }
}

function createSupabaseFromEnv(envFilePath) {
  const env = parseDotEnv(envFilePath)
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function fetchVideoStatus(envFilePath) {
  if (!existsSync(envFilePath)) {
    throw new Error(`Env file not found: ${envFilePath}`)
  }

  const canonical = buildCanonicalLessons()
  const titles = canonical.map((lesson) => lesson.videoTitle)
  const canonicalByTitle = new Map(canonical.map((lesson) => [lesson.videoTitle, lesson]))

  const supabase = createSupabaseFromEnv(envFilePath)
  const { data, error } = await supabase
    .from("videos")
    .select("id,title,status,migration_status,mux_asset_id,mux_playback_id")
    .in("title", titles)

  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`)
  }

  const rows = data ?? []
  const missingVideoRows = titles.filter((title) => !rows.some((row) => row.title === title))
  const standInWelcome = rows.find((row) => row.mux_playback_id === STAND_IN_WELCOME_PLAYBACK_ID)

  const lessonRows = rows.map((row) => {
    const canonicalLesson = canonicalByTitle.get(row.title)
    return {
      key: canonicalLesson?.key ?? "unknown",
      moduleSlug: canonicalLesson?.moduleSlug ?? "unknown",
      lessonSlug: canonicalLesson?.lessonSlug ?? "unknown",
      title: row.title,
      id: row.id,
      status: row.status,
      migration_status: row.migration_status,
      mux_asset_id: row.mux_asset_id,
      mux_playback_id: row.mux_playback_id,
      readyForLessonPublish:
        row.status === "ready" || row.status === "published"
          ? Boolean(row.mux_playback_id) && row.mux_playback_id !== STAND_IN_WELCOME_PLAYBACK_ID
          : false,
      standInDetected: row.mux_playback_id === STAND_IN_WELCOME_PLAYBACK_ID,
    }
  })

  return {
    courseSlug: COURSE_SLUG,
    totalExpected: titles.length,
    foundRows: rows.length,
    missingVideoRows,
    standInWelcomeDetected: Boolean(standInWelcome),
    standInPlaybackId: STAND_IN_WELCOME_PLAYBACK_ID,
    rows: lessonRows,
  }
}

function safeToPublish(statusReport) {
  const readyLessons = statusReport.rows.filter((row) => row.readyForLessonPublish)
  const blockedLessons = statusReport.rows.filter((row) => !row.readyForLessonPublish)
  const launchReady = blockedLessons.length === 0 && !statusReport.standInWelcomeDetected

  return {
    publishRules: [
      "Video must have mux_playback_id and status ready/published.",
      "Lesson should publish only when linked video is ready.",
      "Module should publish only when intended lessons are ready.",
      "Course should remain draft until all required media are verified.",
      "Never publish empty lessons.",
    ],
    standInWelcomeDetected: statusReport.standInWelcomeDetected,
    readyLessons,
    blockedLessons,
    launchReady,
  }
}

function blockers({ inventoryReport, missingFilesReport, statusReport }) {
  const blockersList = []

  if (!inventoryReport.ok) {
    blockersList.push({
      type: "inventory_validation",
      message: "Inventory CSV is incomplete or malformed for 22-lesson migration.",
      details: inventoryReport,
    })
  }

  if (missingFilesReport.missingManifestKeys.length > 0) {
    blockersList.push({
      type: "manifest_missing_keys",
      message: "Manifest does not include all canonical lesson keys.",
      details: missingFilesReport.missingManifestKeys,
    })
  }
  if (missingFilesReport.missingSource.length > 0) {
    blockersList.push({
      type: "source_missing",
      message: "One or more lessons have neither localPath nor driveUrl.",
      details: missingFilesReport.missingSource,
    })
  }
  if (missingFilesReport.sourceConflicts.length > 0) {
    blockersList.push({
      type: "source_conflict",
      message: "Some lessons define both localPath and driveUrl; choose one per lesson.",
      details: missingFilesReport.sourceConflicts,
    })
  }
  if (missingFilesReport.invalidLocalPaths.length > 0 || missingFilesReport.invalidUrls.length > 0) {
    blockersList.push({
      type: "source_invalid",
      message: "Manifest contains unreadable local files or invalid URLs.",
      details: {
        invalidLocalPaths: missingFilesReport.invalidLocalPaths,
        invalidUrls: missingFilesReport.invalidUrls,
      },
    })
  }

  if (statusReport.missingVideoRows.length > 0) {
    blockersList.push({
      type: "db_missing_video_rows",
      message: "Expected video rows are missing in database.",
      details: statusReport.missingVideoRows,
    })
  }

  if (statusReport.standInWelcomeDetected) {
    blockersList.push({
      type: "welcome_stand_in_present",
      message:
        "Welcome still uses stand-in playback ID. Do not consider launch-ready until Welcome is replaced and verified.",
      details: { standInPlaybackId: STAND_IN_WELCOME_PLAYBACK_ID },
    })
  }

  const notReadyRows = statusReport.rows.filter((row) => !row.readyForLessonPublish)
  if (notReadyRows.length > 0) {
    blockersList.push({
      type: "videos_not_ready",
      message: "Some lessons are not ready for safe publish.",
      details: notReadyRows.map((row) => ({
        key: row.key,
        title: row.title,
        status: row.status,
        migration_status: row.migration_status,
        mux_playback_id: row.mux_playback_id,
      })),
    })
  }

  return {
    blockerCount: blockersList.length,
    blockers: blockersList,
    launchReady: blockersList.length === 0,
  }
}

function printUsage() {
  console.log(`Usage:
  node scripts/reset-media-ops.mjs validate-inventory [--inventory docs/7-day-elevated-reset-media-inventory.csv]
  node scripts/reset-media-ops.mjs missing-files [--manifest scripts/reset-media-manifest.json]
  node scripts/reset-media-ops.mjs status [--env-file .env.local]
  node scripts/reset-media-ops.mjs safe-to-publish [--env-file .env.local]
  node scripts/reset-media-ops.mjs blockers [--env-file .env.local] [--manifest scripts/reset-media-manifest.json] [--inventory docs/7-day-elevated-reset-media-inventory.csv]
`)
}

async function main() {
  const command = process.argv[2]
  if (!command || command === "--help" || command === "-h") {
    printUsage()
    return
  }

  const inventoryPath = resolve(
    process.cwd(),
    parseArgValue("--inventory", "docs/7-day-elevated-reset-media-inventory.csv"),
  )
  const manifestPath = resolve(
    process.cwd(),
    parseArgValue("--manifest", "scripts/reset-media-manifest.json"),
  )
  const envFilePath = resolve(process.cwd(), parseArgValue("--env-file", ".env.local"))

  if (command === "validate-inventory") {
    console.log(JSON.stringify(validateInventory(inventoryPath), null, 2))
    return
  }

  if (command === "missing-files") {
    console.log(JSON.stringify(missingFiles(manifestPath), null, 2))
    return
  }

  if (command === "status") {
    console.log(JSON.stringify(await fetchVideoStatus(envFilePath), null, 2))
    return
  }

  if (command === "safe-to-publish") {
    const statusReport = await fetchVideoStatus(envFilePath)
    console.log(JSON.stringify(safeToPublish(statusReport), null, 2))
    return
  }

  if (command === "blockers") {
    const [inventoryReport, missingFilesReport, statusReport] = await Promise.all([
      Promise.resolve(validateInventory(inventoryPath)),
      Promise.resolve(missingFiles(manifestPath)),
      fetchVideoStatus(envFilePath),
    ])
    console.log(
      JSON.stringify(
        blockers({
          inventoryReport,
          missingFilesReport,
          statusReport,
        }),
        null,
        2,
      ),
    )
    return
  }

  throw new Error(`Unknown command "${command}"`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
