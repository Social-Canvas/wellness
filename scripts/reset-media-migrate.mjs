#!/usr/bin/env node

import { accessSync, createReadStream, existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

import Mux from "@mux/mux-node"
import { createClient } from "@supabase/supabase-js"

import { selectLessons } from "./reset-media-selection.mjs"

const COURSE_SLUG = "7-day-reset-meditation-series"
const STAND_IN_WELCOME_PLAYBACK_ID = "cevtQPbDchk4Foe666xyBV2KUyp7xbQSPhtFCMc7Kv4"

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

function parseArgValue(name, fallback = "") {
  const index = process.argv.indexOf(name)
  if (index === -1 || index + 1 >= process.argv.length) return fallback
  return process.argv[index + 1]
}

function hasArg(name) {
  return process.argv.includes(name)
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, "utf8"))
}

function writeJson(pathname, value) {
  writeFileSync(pathname, `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

function getSignedPlaybackId(asset) {
  const playbackIds = asset.playback_ids ?? []
  const signed = playbackIds.find((playback) => playback.policy === "signed")
  return signed?.id ?? playbackIds[0]?.id ?? null
}

function isPresentString(value) {
  return typeof value === "string" && value.trim().length > 0
}

function normalizeManifestSource(value) {
  if (!isPresentString(value)) return ""
  const trimmed = value.trim()
  if (trimmed.toUpperCase() === "TBD") return ""
  return trimmed
}

function assertFileReadable(pathname) {
  accessSync(pathname)
}

async function waitForUploadAssetId(mux, uploadId, maxPolls, pollIntervalMs) {
  for (let attempt = 1; attempt <= maxPolls; attempt += 1) {
    const upload = await mux.video.uploads.retrieve(uploadId)
    if (upload.asset_id) return upload.asset_id
    if (upload.status === "errored") {
      throw new Error(`Mux upload ${uploadId} errored before asset creation.`)
    }
    await sleep(pollIntervalMs)
  }
  throw new Error(`Timed out waiting for upload ${uploadId} to receive asset_id.`)
}

async function waitForAssetState(mux, assetId, maxPolls, pollIntervalMs) {
  let latest = null
  for (let attempt = 1; attempt <= maxPolls; attempt += 1) {
    latest = await mux.video.assets.retrieve(assetId)
    if (latest.status === "ready" || latest.status === "errored") {
      return latest
    }
    await sleep(pollIntervalMs)
  }
  return latest
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
}

async function syncVideoFromAsset(supabase, video, asset) {
  const playbackId = getSignedPlaybackId(asset)
  const durationSeconds = typeof asset.duration === "number" ? Math.round(asset.duration) : null
  const thumbnailUrl = playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg` : null

  let status = "processing"
  let migrationStatus = "uploaded"
  if (asset.status === "ready") {
    status = "ready"
    migrationStatus = "verified"
  } else if (asset.status === "errored") {
    status = "failed"
    migrationStatus = "failed"
  }

  const { data, error } = await supabase
    .from("videos")
    .update({
      status,
      migration_status: migrationStatus,
      mux_asset_id: asset.id,
      mux_playback_id: playbackId,
      duration_seconds: durationSeconds,
      thumbnail_url: thumbnailUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", video.id)
    .select("id,title,status,migration_status,mux_asset_id,mux_playback_id")
    .single()

  if (error) {
    throw new Error(`Failed syncing DB row for "${video.title}": ${error.message}`)
  }
  return data
}

async function createAssetFromDriveUrl(mux, videoId, driveUrl) {
  const asset = await mux.video.assets.create({
    input: [{ url: driveUrl }],
    playback_policy: ["signed"],
    passthrough: JSON.stringify({ video_id: videoId }),
  })
  return { assetId: asset.id, uploadMode: "drive_url_ingest", uploadId: null }
}

async function createAssetFromLocalPath(mux, videoId, localPath, appUrl, maxPolls, pollIntervalMs) {
  const upload = await mux.video.uploads.create({
    cors_origin: appUrl || undefined,
    new_asset_settings: {
      playback_policy: ["signed"],
      passthrough: JSON.stringify({ video_id: videoId }),
    },
  })
  if (!upload.url) {
    throw new Error("Mux direct upload response missing upload URL.")
  }

  const stream = createReadStream(localPath)
  const uploadResponse = await fetch(upload.url, {
    method: "PUT",
    headers: { "content-type": "application/octet-stream" },
    body: stream,
    duplex: "half",
  })
  if (!uploadResponse.ok) {
    throw new Error(`Mux direct upload failed with status ${uploadResponse.status}.`)
  }

  const assetId = await waitForUploadAssetId(mux, upload.id, maxPolls, pollIntervalMs)
  return { assetId, uploadMode: "local_direct_upload", uploadId: upload.id }
}

function ensureManifestShape(manifest) {
  if (!manifest || typeof manifest !== "object") {
    throw new Error("Manifest must be a JSON object.")
  }
  if (manifest.courseSlug !== COURSE_SLUG) {
    throw new Error(`Manifest courseSlug must be "${COURSE_SLUG}".`)
  }
  if (!manifest.lessons || typeof manifest.lessons !== "object") {
    throw new Error("Manifest must contain a lessons object.")
  }
}

function loadState(pathname) {
  if (!existsSync(pathname)) {
    return {
      generatedAt: null,
      courseSlug: COURSE_SLUG,
      standInWelcomePlaybackId: STAND_IN_WELCOME_PLAYBACK_ID,
      lessons: {},
    }
  }
  return readJson(pathname)
}

async function main() {
  const manifestPath = resolve(process.cwd(), parseArgValue("--manifest", "scripts/reset-media-manifest.json"))
  const envFilePath = resolve(process.cwd(), parseArgValue("--env-file", ".env.local"))
  const stateOutPath = resolve(
    process.cwd(),
    parseArgValue("--state-out", "docs/7-day-elevated-reset-media-migration-status.json"),
  )
  const lessonKeyFilter = parseArgValue("--lesson-key", "")
  const onlyFilter = parseArgValue("--only", "")
  const dryRun = hasArg("--dry-run")
  const pollIntervalMs = Number.parseInt(parseArgValue("--poll-interval-ms", "5000"), 10)
  const maxPolls = Number.parseInt(parseArgValue("--max-polls", "120"), 10)

  if (!existsSync(manifestPath)) {
    throw new Error(`Manifest not found at ${manifestPath}`)
  }
  if (!existsSync(envFilePath)) {
    throw new Error(`Env file not found at ${envFilePath}`)
  }
  if (!Number.isFinite(pollIntervalMs) || pollIntervalMs < 1000) {
    throw new Error("--poll-interval-ms must be >= 1000")
  }
  if (!Number.isFinite(maxPolls) || maxPolls < 1) {
    throw new Error("--max-polls must be >= 1")
  }

  const env = parseDotEnv(envFilePath)
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY
  const muxTokenId = process.env.MUX_TOKEN_ID || env.MUX_TOKEN_ID
  const muxTokenSecret = process.env.MUX_TOKEN_SECRET || env.MUX_TOKEN_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_APP_URL || ""

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).")
  }
  if (!muxTokenId || !muxTokenSecret) {
    throw new Error("Missing Mux credentials (MUX_TOKEN_ID + MUX_TOKEN_SECRET).")
  }

  const canonicalLessons = buildCanonicalLessons()
  const canonicalByKey = new Map(canonicalLessons.map((lesson) => [lesson.key, lesson]))
  const expectedTitles = canonicalLessons.map((lesson) => lesson.videoTitle)

  const manifest = readJson(manifestPath)
  ensureManifestShape(manifest)

  const unknownKeys = Object.keys(manifest.lessons).filter((key) => !canonicalByKey.has(key))
  if (unknownKeys.length > 0) {
    throw new Error(`Manifest includes unknown lesson keys: ${unknownKeys.join(", ")}`)
  }

  const lessonsToProcess = selectLessons(canonicalLessons, {
    only: onlyFilter,
    lessonKey: lessonKeyFilter,
  })

  // Print the exact selection before any Mux/Supabase mutation. Every Mux
  // upload and Supabase write happens inside the per-lesson loop below, so
  // lessons absent from this list receive zero provider calls.
  const selectionMode = onlyFilter ? "only" : lessonKeyFilter ? "lesson-key" : "all"
  console.log(
    JSON.stringify(
      {
        selection: {
          mode: selectionMode,
          dryRun,
          selectedCount: lessonsToProcess.length,
          selectedKeys: lessonsToProcess.map((lesson) => lesson.key),
        },
      },
      null,
      2,
    ),
  )

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const mux = new Mux({ tokenId: muxTokenId, tokenSecret: muxTokenSecret })

  const { data: videoRows, error: videoError } = await supabase
    .from("videos")
    .select("id,title,status,migration_status,mux_asset_id,mux_playback_id")
    .in("title", expectedTitles)

  if (videoError) {
    throw new Error(`Failed to query videos: ${videoError.message}`)
  }

  const videosByTitle = new Map()
  for (const row of videoRows ?? []) {
    if (videosByTitle.has(row.title)) {
      throw new Error(`Duplicate video title in DB: "${row.title}"`)
    }
    videosByTitle.set(row.title, row)
  }

  const missingVideoTitles = expectedTitles.filter((title) => !videosByTitle.has(title))
  if (missingVideoTitles.length > 0) {
    throw new Error(`Missing expected video rows in DB: ${missingVideoTitles.join(" | ")}`)
  }

  const state = loadState(stateOutPath)
  state.generatedAt = new Date().toISOString()
  state.courseSlug = COURSE_SLUG
  state.manifestPath = manifestPath
  state.standInWelcomePlaybackId = STAND_IN_WELCOME_PLAYBACK_ID
  state.lessons = state.lessons ?? {}

  let processedCount = 0
  let skippedCount = 0
  let blockedCount = 0
  let failedCount = 0

  for (const lesson of lessonsToProcess) {
    const manifestEntry = manifest.lessons[lesson.key] ?? {}
    const localPathRaw = normalizeManifestSource(manifestEntry.localPath)
    const driveUrlRaw = normalizeManifestSource(manifestEntry.driveUrl)
    const sourceFilenameRaw = normalizeManifestSource(manifestEntry.sourceFilename)
    const video = videosByTitle.get(lesson.videoTitle)
    const isStandInWelcome = lesson.isWelcome && video.mux_playback_id === STAND_IN_WELCOME_PLAYBACK_ID
    const hasSource = Boolean(localPathRaw || driveUrlRaw)

    state.lessons[lesson.key] = {
      key: lesson.key,
      moduleSlug: lesson.moduleSlug,
      lessonSlug: lesson.lessonSlug,
      videoTitle: lesson.videoTitle,
      videoId: video.id,
      sourceFilename: sourceFilenameRaw || null,
      sourceMode: localPathRaw ? "localPath" : driveUrlRaw ? "driveUrl" : null,
      sourceValue: localPathRaw || driveUrlRaw || null,
      previousDbState: {
        status: video.status,
        migration_status: video.migration_status,
        mux_asset_id: video.mux_asset_id,
        mux_playback_id: video.mux_playback_id,
      },
      updatedAt: new Date().toISOString(),
    }

    if (localPathRaw && driveUrlRaw) {
      blockedCount += 1
      state.lessons[lesson.key].result = "blocked"
      state.lessons[lesson.key].note = "Provide exactly one source: localPath or driveUrl."
      continue
    }

    if (!hasSource) {
      if (lesson.isWelcome && isStandInWelcome) {
        blockedCount += 1
        state.lessons[lesson.key].result = "blocked"
        state.lessons[lesson.key].note =
          "Welcome still uses stand-in playback ID. Provide real source in manifest before launch."
        continue
      }
      skippedCount += 1
      state.lessons[lesson.key].result = "skipped"
      state.lessons[lesson.key].note = "No manifest source provided."
      continue
    }

    if (localPathRaw) {
      const resolvedLocalPath = resolve(process.cwd(), localPathRaw)
      try {
        assertFileReadable(resolvedLocalPath)
      } catch {
        blockedCount += 1
        state.lessons[lesson.key].result = "blocked"
        state.lessons[lesson.key].note = `Local file not readable: ${resolvedLocalPath}`
        continue
      }
      state.lessons[lesson.key].resolvedLocalPath = resolvedLocalPath
    }

    if (driveUrlRaw && !/^https?:\/\//i.test(driveUrlRaw)) {
      blockedCount += 1
      state.lessons[lesson.key].result = "blocked"
      state.lessons[lesson.key].note = "driveUrl must be an explicit http(s) download URL."
      continue
    }

    const alreadyReadyWithRealPlayback =
      Boolean(video.mux_playback_id) &&
      video.mux_playback_id !== STAND_IN_WELCOME_PLAYBACK_ID &&
      (video.status === "ready" || video.status === "published")

    if (alreadyReadyWithRealPlayback) {
      skippedCount += 1
      state.lessons[lesson.key].result = "skipped"
      state.lessons[lesson.key].note = "Video already has real mux_playback_id and ready/published status."
      continue
    }

    try {
      if (dryRun) {
        processedCount += 1
        state.lessons[lesson.key].result = "dry_run"
        state.lessons[lesson.key].note = "Dry run only; no upload or DB updates performed."
        continue
      }

      let assetId = video.mux_asset_id
      let uploadMode = null
      let uploadId = null

      if (!assetId || isStandInWelcome) {
        if (localPathRaw) {
          const localAsset = await createAssetFromLocalPath(
            mux,
            video.id,
            state.lessons[lesson.key].resolvedLocalPath,
            appUrl,
            maxPolls,
            pollIntervalMs,
          )
          assetId = localAsset.assetId
          uploadMode = localAsset.uploadMode
          uploadId = localAsset.uploadId
        } else {
          const urlAsset = await createAssetFromDriveUrl(mux, video.id, driveUrlRaw)
          assetId = urlAsset.assetId
          uploadMode = urlAsset.uploadMode
          uploadId = urlAsset.uploadId
        }
      }

      const asset = await waitForAssetState(mux, assetId, maxPolls, pollIntervalMs)
      if (!asset) {
        throw new Error("Unable to retrieve Mux asset after upload.")
      }

      const syncedVideo = await syncVideoFromAsset(supabase, video, asset)
      const playbackId = asset.status === "ready" ? getSignedPlaybackId(asset) : syncedVideo.mux_playback_id

      processedCount += 1
      state.lessons[lesson.key].result = asset.status === "ready" ? "synced_ready" : "synced_processing"
      state.lessons[lesson.key].uploadMode = uploadMode
      state.lessons[lesson.key].uploadId = uploadId
      state.lessons[lesson.key].assetId = asset.id
      state.lessons[lesson.key].playbackId = playbackId
      state.lessons[lesson.key].assetStatus = asset.status
      state.lessons[lesson.key].dbState = {
        status: syncedVideo.status,
        migration_status: syncedVideo.migration_status,
        mux_asset_id: syncedVideo.mux_asset_id,
        mux_playback_id: syncedVideo.mux_playback_id,
      }
      if (lesson.isWelcome && isStandInWelcome) {
        state.lessons[lesson.key].note =
          "Welcome replacement synced. Keep stand-in asset undeleted until manual playback verification succeeds."
      } else {
        state.lessons[lesson.key].note = "Mux asset synced to existing video row."
      }
    } catch (error) {
      failedCount += 1
      state.lessons[lesson.key].result = "failed"
      state.lessons[lesson.key].note = error instanceof Error ? error.message : String(error)
    }
  }

  state.summary = {
    processedCount,
    skippedCount,
    blockedCount,
    failedCount,
    totalConsidered: lessonsToProcess.length,
  }

  writeJson(stateOutPath, state)

  console.log(
    JSON.stringify(
      {
        summary: state.summary,
        stateOutPath,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
