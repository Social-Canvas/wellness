#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

const WELCOME_ASSET_ID = "cevtQPbDchk4Foe666xyBV2KUyp7xbQSPhtFCMc7Kv4"
const DEFAULT_SOURCE_URL = "TBD - user supplies explicit source"
const DEFAULT_SOURCE_FILENAME = "TBD"

const HEADER = [
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

function buildLessonRows() {
  const rows = [
    {
      module: "welcome",
      lesson: "welcome",
      manifestKey: "welcome",
      videoTitle: "7-Day Elevated Reset — Welcome",
      defaults: {
        downloadStatus: "pending_real_export",
        muxUploadStatus: "stand_in_uploaded_replace_before_launch",
        muxAssetId: WELCOME_ASSET_ID,
        attachmentStatus: "linked_to_stand_in",
        publishStatus: "published_e2e_only",
        notes:
          "Stand-in clip on Mux. REPLACE BEFORE LAUNCH with explicit real Welcome file/URL in manifest; re-verify playback before deleting stand-in.",
      },
    },
  ]

  for (let day = 1; day <= 7; day += 1) {
    rows.push(
      {
        module: `day-${day}`,
        lesson: "morning",
        manifestKey: `day${day}_morning`,
        videoTitle: `7-Day Elevated Reset — Day ${day} Morning Meditation`,
      },
      {
        module: `day-${day}`,
        lesson: "afternoon",
        manifestKey: `day${day}_afternoon`,
        videoTitle: `7-Day Elevated Reset — Day ${day} Afternoon Regroup / Refocus`,
      },
      {
        module: `day-${day}`,
        lesson: "evening",
        manifestKey: `day${day}_evening`,
        videoTitle: `7-Day Elevated Reset — Day ${day} Evening Meditation`,
      },
    )
  }

  return rows
}

function parseDotEnv(pathname) {
  try {
    const content = readFileSync(pathname, "utf8")
    const map = {}
    for (const rawLine of content.split("\n")) {
      const line = rawLine.trim()
      if (!line || line.startsWith("#")) continue
      const eqIndex = line.indexOf("=")
      if (eqIndex === -1) continue
      const key = line.slice(0, eqIndex).trim()
      const value = line.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, "")
      map[key] = value
    }
    return map
  } catch {
    return {}
  }
}

function csvEscape(value) {
  const str = value == null ? "" : String(value)
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsvLine(values) {
  return values.map(csvEscape).join(",")
}

function getArgValue(name, fallback = "") {
  const idx = process.argv.indexOf(name)
  if (idx === -1 || idx + 1 >= process.argv.length) return fallback
  return process.argv[idx + 1]
}

async function fetchVideoMap() {
  const envFile = resolve(process.cwd(), getArgValue("--env-file", ".env.local"))
  const env = parseDotEnv(envFile)

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      `Missing Supabase credentials. Expected NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (checked process env + ${envFile}).`,
    )
  }

  const { createClient } = await import("@supabase/supabase-js")
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const expectedTitles = buildLessonRows().map((row) => row.videoTitle)
  const { data, error } = await supabase
    .from("videos")
    .select("id,title,status,migration_status,mux_asset_id,mux_playback_id")
    .in("title", expectedTitles)

  if (error) {
    throw new Error(`Supabase query failed: ${error.message}`)
  }

  const map = new Map()
  for (const row of data ?? []) {
    map.set(row.title, row)
  }
  return map
}

function renderRows(videoMap) {
  return buildLessonRows().map((entry) => {
    const db = videoMap?.get(entry.videoTitle)
    const defaults = entry.defaults ?? {}

    const downloadStatus = defaults.downloadStatus ?? "not_started"
    const muxUploadStatus = defaults.muxUploadStatus ?? "not_started"
    const muxAssetId = db?.mux_asset_id ?? defaults.muxAssetId ?? ""
    const playbackId = db?.mux_playback_id ?? ""
    const attachmentStatus = defaults.attachmentStatus ?? "not_attached"
    const publishStatus = defaults.publishStatus ?? (db?.status ?? "draft")
    const notes = defaults.notes ?? "Awaiting explicit source and first Mux upload."
    const videoId = db?.id ?? ""

    return [
      entry.module,
      entry.lesson,
      entry.manifestKey,
      "local_or_drive_explicit",
      DEFAULT_SOURCE_URL,
      DEFAULT_SOURCE_FILENAME,
      entry.videoTitle,
      videoId,
      downloadStatus,
      muxUploadStatus,
      muxAssetId,
      playbackId,
      attachmentStatus,
      publishStatus,
      notes,
    ]
  })
}

async function main() {
  const shouldQueryDb = process.argv.includes("--query-db")
  const outputPath = resolve(process.cwd(), getArgValue("--out", "docs/7-day-elevated-reset-media-inventory.csv"))

  let videoMap = null
  if (shouldQueryDb) {
    videoMap = await fetchVideoMap()
  }

  const csv = [toCsvLine(HEADER), ...renderRows(videoMap).map((row) => toCsvLine(row))].join("\n")
  writeFileSync(outputPath, `${csv}\n`, "utf8")

  const mode = shouldQueryDb ? "template + DB status" : "template only"
  console.log(`Wrote ${outputPath} (${mode}).`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
