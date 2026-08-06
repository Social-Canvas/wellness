#!/usr/bin/env node
/**
 * Import Autoimmune Online Course videos + resources into the EXISTING
 * `autoimmune-masterclass` course. Idempotent Mux upload/reuse + private
 * Supabase Storage for non-video materials.
 *
 * Does not invent curriculum beyond filenames. Does not touch Reset,
 * recorded sessions, Stripe, or testimonials.
 *
 * Usage:
 *   node scripts/autoimmune-course-import.mjs --dry-run
 *   node scripts/autoimmune-course-import.mjs --apply
 *   node scripts/autoimmune-course-import.mjs --apply --inventory-dir ~/Downloads/autoimmune\ online\ course
 */

import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { homedir } from "node:os"
import { basename, resolve } from "node:path"
import { createClient } from "@supabase/supabase-js"
import Mux from "@mux/mux-node"

const COURSE_SLUG = "autoimmune-masterclass"
const PRODUCT_SLUG = "autoimmune-masterclass"
const RESOURCES_BUCKET = "course-resources"
const DEFAULT_INVENTORY_DIR = resolve(homedir(), "Downloads/autoimmune online course")

/**
 * Lesson map derived from inventory filenames only.
 * Intro is a short starter video; Days 1–5 map onto existing lesson-01…05.
 */
const VIDEO_KEYS = [
  {
    key: "intro",
    lessonSlug: "intro",
    title: "Intro to Autoimmune",
    sortOrder: 0,
    createLesson: true,
    patterns: [/^intro\s+to\s+autoimmune\.mp4$/i],
  },
  {
    key: "day-1",
    lessonSlug: "lesson-01",
    title: "Masterclass Day 1",
    sortOrder: 1,
    createLesson: false,
    patterns: [/^masterclass_day1_autoimmune\.mp4$/i],
  },
  {
    key: "day-2",
    lessonSlug: "lesson-02",
    title: "Masterclass Day 2",
    sortOrder: 2,
    createLesson: false,
    patterns: [/^masterclass_day2_autoimmune\.mp4$/i],
  },
  {
    key: "day-3",
    lessonSlug: "lesson-03",
    title: "Day 3 Inflammation",
    sortOrder: 3,
    createLesson: false,
    patterns: [/^day\s*3[_\s-]*inflammation\.mp4$/i],
  },
  {
    key: "day-4",
    lessonSlug: "lesson-04",
    title: "Day 4 Gut Health",
    sortOrder: 4,
    createLesson: false,
    patterns: [/^day\s*4[_\s-]*gut\s*health\.mp4$/i],
  },
  {
    key: "day-5",
    lessonSlug: "lesson-05",
    title: "Day 5 Hormonal Imbalance",
    sortOrder: 5,
    createLesson: false,
    patterns: [/^day\s*5[_\s-]*hormonal\s*imbalance\.mp4$/i],
  },
]

const RESOURCE_KEYS = [
  {
    key: "workbook",
    slug: "autoimmune-workbook",
    title: "Autoimmune Workbook",
    fileName: "Autoimmune Workbook.pdf",
    sortOrder: 1,
    mimeType: "application/pdf",
    patterns: [/^autoimmune\s+workbook.*\.pdf$/i],
  },
  {
    key: "module-1-slides",
    slug: "module-1-class-1-slides",
    title: "Module 1 Class 1 Slides",
    fileName: "Module 1 Class 1 Slides.pptx",
    sortOrder: 2,
    mimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    patterns: [/^module\s*1[_\s-]*class\s*1\s*slides\.pptx$/i],
  },
  {
    key: "module-1-text",
    slug: "module-1-class-1-text",
    title: "Module 1 Class 1 Text",
    fileName: "Module 1 Class 1 Text.docx",
    sortOrder: 3,
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    patterns: [/^module\s*1[_\s-]*class\s*1\s*text\.docx$/i],
  },
  {
    key: "summary",
    slug: "course-summary",
    title: "Summary of Autoimmune Online Course",
    fileName: "Summary of autoimmune online course.docx",
    sortOrder: 4,
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    patterns: [/^summary\s+of\s+autoimmune\s+online\s+course\.docx$/i],
  },
]

const SKIP_GOOGLE_NATIVE = [/\.gdoc$/i, /\.gslides$/i]

function loadEnv(path) {
  if (!existsSync(path)) return {}
  const env = {}
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const i = line.indexOf("=")
    if (i < 0) continue
    const k = line.slice(0, i).trim()
    let v = line.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    env[k] = v
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

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
}

function matchEntry(filename, entries) {
  for (const entry of entries) {
    if (entry.patterns.some((pattern) => pattern.test(filename))) return entry
  }
  return null
}

function readMp4DurationSeconds(pathname) {
  const data = readFileSync(pathname)
  const idx = data.indexOf(Buffer.from("mvhd"))
  if (idx < 0) return null
  const version = data[idx + 4]
  let timescale
  let duration
  if (version === 0) {
    timescale = data.readUInt32BE(idx + 16)
    duration = data.readUInt32BE(idx + 20)
  } else {
    timescale = data.readUInt32BE(idx + 20)
    duration = Number(data.readBigUInt64BE(idx + 24))
  }
  if (!timescale) return null
  return duration / timescale
}

function getSignedPlaybackId(asset) {
  const playbackIds = asset.playback_ids ?? []
  const signed = playbackIds.find((playback) => playback.policy === "signed")
  return signed?.id ?? playbackIds[0]?.id ?? null
}

async function waitForUploadAssetId(mux, uploadId, maxPolls, pollIntervalMs) {
  for (let attempt = 1; attempt <= maxPolls; attempt += 1) {
    const upload = await mux.video.uploads.retrieve(uploadId)
    if (upload.asset_id) return upload.asset_id
    if (upload.status === "errored" || upload.error) {
      throw new Error(`Mux upload errored: ${uploadId}`)
    }
    await sleep(pollIntervalMs)
  }
  throw new Error(`Timed out waiting for Mux upload asset: ${uploadId}`)
}

async function waitForAssetReady(mux, assetId, maxPolls, pollIntervalMs) {
  for (let attempt = 1; attempt <= maxPolls; attempt += 1) {
    const asset = await mux.video.assets.retrieve(assetId)
    if (asset.status === "ready") return asset
    if (asset.status === "errored") {
      throw new Error(`Mux asset errored: ${assetId}`)
    }
    console.log(`  waiting asset ready (${attempt}/${maxPolls}): ${asset.status}`)
    await sleep(pollIntervalMs)
  }
  throw new Error(`Timed out waiting for Mux asset ready: ${assetId}`)
}

async function uploadLocalMp4(mux, absolutePath, passthrough, appUrl, maxPolls, pollIntervalMs) {
  const upload = await mux.video.uploads.create({
    cors_origin: appUrl || "*",
    new_asset_settings: {
      playback_policy: ["signed"],
      passthrough: JSON.stringify(passthrough),
    },
  })
  if (!upload.url) throw new Error("Mux did not return an upload URL.")

  const size = statSync(absolutePath).size
  const response = await fetch(upload.url, {
    method: "PUT",
    body: createReadStream(absolutePath),
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(size),
    },
    duplex: "half",
  })
  if (!response.ok) {
    throw new Error(`Upload PUT failed for ${basename(absolutePath)}: ${response.status}`)
  }

  const assetId = await waitForUploadAssetId(mux, upload.id, maxPolls, pollIntervalMs)
  return { uploadId: upload.id, assetId }
}

async function ensureBucket(supabase) {
  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) throw error
  const exists = (buckets ?? []).some((bucket) => bucket.id === RESOURCES_BUCKET)
  if (exists) return
  const { error: createError } = await supabase.storage.createBucket(RESOURCES_BUCKET, {
    public: false,
    fileSizeLimit: 52428800,
    allowedMimeTypes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/msword",
    ],
  })
  if (createError && !/already exists/i.test(createError.message)) {
    throw createError
  }
}

async function main() {
  const apply = hasArg("--apply")
  const dryRun = hasArg("--dry-run") || !apply
  const inventoryDir = resolve(
    parseArgValue("--inventory-dir", DEFAULT_INVENTORY_DIR)
  )
  const pollIntervalMs = Number.parseInt(parseArgValue("--poll-interval-ms", "5000"), 10)
  const maxPolls = Number.parseInt(parseArgValue("--max-polls", "180"), 10)

  const env = { ...loadEnv(".env"), ...loadEnv(".env.local") }

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        inventoryDir,
        courseSlug: COURSE_SLUG,
        expectedVideos: VIDEO_KEYS.length,
        expectedResources: RESOURCE_KEYS.length,
      },
      null,
      2
    )
  )

  if (!existsSync(inventoryDir)) {
    throw new Error(`Inventory directory not found: ${inventoryDir}`)
  }

  const googleExportsNeeded = []
  const unmatched = []
  const matchedVideos = new Map()
  const matchedResources = new Map()

  for (const name of readdirSync(inventoryDir)) {
    const pathname = resolve(inventoryDir, name)
    if (!statSync(pathname).isFile()) continue

    if (SKIP_GOOGLE_NATIVE.some((pattern) => pattern.test(name))) {
      googleExportsNeeded.push({
        name,
        note: "Export to PDF/PPTX/DOCX before import",
      })
      continue
    }

    const videoKey = matchEntry(name, VIDEO_KEYS)
    if (videoKey) {
      if (matchedVideos.has(videoKey.key)) {
        throw new Error(`Duplicate video match for ${videoKey.key}`)
      }
      const duration = readMp4DurationSeconds(pathname)
      matchedVideos.set(videoKey.key, {
        name,
        pathname,
        sizeBytes: statSync(pathname).size,
        durationSeconds: duration ? Math.round(duration) : null,
        ...videoKey,
      })
      continue
    }

    const resourceKey = matchEntry(name, RESOURCE_KEYS)
    if (resourceKey) {
      if (matchedResources.has(resourceKey.key)) {
        throw new Error(`Duplicate resource match for ${resourceKey.key}`)
      }
      matchedResources.set(resourceKey.key, {
        name,
        pathname,
        sizeBytes: statSync(pathname).size,
        ...resourceKey,
      })
      continue
    }

    unmatched.push(name)
  }

  console.log("GOOGLE_EXPORTS_NEEDED", googleExportsNeeded)
  console.log("UNMATCHED_FILES", unmatched)

  for (const entry of VIDEO_KEYS) {
    const file = matchedVideos.get(entry.key)
    if (!file) throw new Error(`Missing required video for ${entry.key}`)
    console.log("LOCAL_VIDEO", JSON.stringify({
      key: entry.key,
      name: file.name,
      durationSeconds: file.durationSeconds,
      sizeBytes: file.sizeBytes,
      lessonSlug: entry.lessonSlug,
      title: entry.title,
    }))
  }

  for (const entry of RESOURCE_KEYS) {
    const file = matchedResources.get(entry.key)
    if (!file) throw new Error(`Missing required resource for ${entry.key}`)
    console.log("LOCAL_RESOURCE", JSON.stringify({
      key: entry.key,
      name: file.name,
      sizeBytes: file.sizeBytes,
      slug: entry.slug,
    }))
  }

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase env.")
  }
  if (!env.MUX_TOKEN_ID || !env.MUX_TOKEN_SECRET) {
    throw new Error("Missing Mux env.")
  }

  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
  const mux = new Mux({
    tokenId: env.MUX_TOKEN_ID,
    tokenSecret: env.MUX_TOKEN_SECRET,
  })
  const appUrl = env.NEXT_PUBLIC_APP_URL || ""

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id,slug,title,status,thumbnail_url")
    .eq("slug", COURSE_SLUG)
    .maybeSingle()
  if (courseError) throw courseError
  if (!course) throw new Error(`Course not found: ${COURSE_SLUG}`)

  const { data: modules, error: modulesError } = await supabase
    .from("modules")
    .select("id,slug,title")
    .eq("course_id", course.id)
  if (modulesError) throw modulesError
  const mainModule = (modules ?? []).find((row) => row.slug === "main")
  if (!mainModule) throw new Error("Autoimmune main module missing.")

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("id,slug,title,sort_order,video_id,status")
    .eq("module_id", mainModule.id)
    .order("sort_order")
  if (lessonsError) throw lessonsError

  const videoIds = (lessons ?? []).map((lesson) => lesson.video_id).filter(Boolean)
  const { data: videos, error: videosError } = videoIds.length
    ? await supabase
        .from("videos")
        .select(
          "id,title,status,mux_asset_id,mux_playback_id,thumbnail_url,duration_seconds,migration_status"
        )
        .in("id", videoIds)
    : { data: [], error: null }
  if (videosError) throw videosError

  console.log("COURSE", course)
  console.log("EXISTING_LESSONS", (lessons ?? []).map((l) => ({
    slug: l.slug,
    title: l.title,
    video_id: l.video_id,
  })))

  const { data: product } = await supabase
    .from("products")
    .select("id,slug,granted_course_id")
    .eq("slug", PRODUCT_SLUG)
    .maybeSingle()

  const assets = []
  for await (const asset of mux.video.assets.list({ limit: 100 })) {
    assets.push({
      id: asset.id,
      status: asset.status,
      duration: asset.duration ?? null,
      playbackId: getSignedPlaybackId(asset),
      passthrough: asset.passthrough ?? null,
    })
  }
  console.log("EXISTING_MUX_ASSETS", assets.length)

  const videoReport = []
  let courseThumbnailUrl = course.thumbnail_url

  for (const entry of VIDEO_KEYS) {
    const local = matchedVideos.get(entry.key)
    let lesson = (lessons ?? []).find((row) => row.slug === entry.lessonSlug) ?? null
    let video =
      (videos ?? []).find((row) => row.id === lesson?.video_id) ?? null

    let chosen =
      (video?.mux_asset_id
        ? assets.find((asset) => asset.id === video.mux_asset_id)
        : null) ?? null

    const passthroughMatch = assets.find((asset) => {
      if (!asset.passthrough) return false
      try {
        const parsed = JSON.parse(asset.passthrough)
        return (
          parsed?.purpose === "autoimmune_course" &&
          parsed?.lesson_key === entry.key
        )
      } catch {
        return false
      }
    })
    if (passthroughMatch) chosen = passthroughMatch
    // Do not reuse unrelated assets by duration alone — false positives are common.

    const row = {
      key: entry.key,
      title: entry.title,
      lessonSlug: entry.lessonSlug,
      localMp4: local.name,
      localDurationSeconds: local.durationSeconds,
      muxAssetId: chosen?.id ?? video?.mux_asset_id ?? null,
      muxPlaybackId: chosen?.playbackId ?? video?.mux_playback_id ?? null,
      lessonId: lesson?.id ?? null,
      videoId: video?.id ?? null,
      action: "pending",
    }

    const readyExisting = chosen && chosen.status === "ready" && chosen.playbackId

    if (readyExisting) {
      row.muxAssetId = chosen.id
      row.muxPlaybackId = chosen.playbackId
      row.action = apply ? "link_existing" : "would_link_existing"
    } else if (dryRun) {
      row.action = "would_upload"
      videoReport.push(row)
      continue
    } else {
      console.log(`Uploading ${local.name} → ${entry.key} (${local.sizeBytes} bytes)`)
      const { assetId } = await uploadLocalMp4(
        mux,
        local.pathname,
        {
          purpose: "autoimmune_course",
          course_slug: COURSE_SLUG,
          lesson_key: entry.key,
        },
        appUrl,
        maxPolls,
        pollIntervalMs
      )
      const asset = await waitForAssetReady(mux, assetId, maxPolls, pollIntervalMs)
      const playbackId = getSignedPlaybackId(asset)
      if (!playbackId) throw new Error(`No signed playback ID for asset ${assetId}`)
      row.muxAssetId = assetId
      row.muxPlaybackId = playbackId
      row.action = "uploaded"
      console.log(`  ready asset=${assetId} playback=${playbackId}`)
    }

    if (!apply) {
      videoReport.push(row)
      continue
    }

    if (!row.muxAssetId || !row.muxPlaybackId) {
      throw new Error(`Missing Mux IDs for ${entry.key}`)
    }

    const thumbnailUrl = `https://image.mux.com/${row.muxPlaybackId}/thumbnail.jpg`
    const durationSeconds =
      local.durationSeconds ??
      (typeof chosen?.duration === "number" ? Math.round(chosen.duration) : null)

    const videoPayload = {
      title: entry.title,
      status: "ready",
      migration_status: "verified",
      mux_asset_id: row.muxAssetId,
      mux_playback_id: row.muxPlaybackId,
      duration_seconds: durationSeconds,
      thumbnail_url: thumbnailUrl,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (video) {
      const { error } = await supabase
        .from("videos")
        .update(videoPayload)
        .eq("id", video.id)
      if (error) throw error
      row.videoId = video.id
    } else {
      const { data: inserted, error } = await supabase
        .from("videos")
        .insert(videoPayload)
        .select("id")
        .single()
      if (error) throw error
      video = inserted
      row.videoId = inserted.id
    }

    if (!lesson) {
      if (!entry.createLesson) {
        throw new Error(`Expected existing lesson ${entry.lessonSlug}`)
      }
      const { data: insertedLesson, error } = await supabase
        .from("lessons")
        .insert({
          module_id: mainModule.id,
          video_id: row.videoId,
          slug: entry.lessonSlug,
          title: entry.title,
          sort_order: entry.sortOrder,
          status: "published",
          is_required: true,
        })
        .select("id")
        .single()
      if (error) throw error
      lesson = insertedLesson
      row.lessonId = insertedLesson.id
      row.action = `${row.action}_created_lesson`
    } else {
      const { error } = await supabase
        .from("lessons")
        .update({
          title: entry.title,
          sort_order: entry.sortOrder,
          video_id: row.videoId,
          status: "published",
          updated_at: new Date().toISOString(),
        })
        .eq("id", lesson.id)
      if (error) throw error
      row.lessonId = lesson.id
      row.action =
        row.action === "uploaded" ? "uploaded_and_linked" : "linked_and_updated"
    }

    if (entry.key === "intro" || !courseThumbnailUrl) {
      courseThumbnailUrl = thumbnailUrl
    }

    videoReport.push(row)
  }

  if (apply && courseThumbnailUrl && courseThumbnailUrl !== course.thumbnail_url) {
    const { error } = await supabase
      .from("courses")
      .update({
        thumbnail_url: courseThumbnailUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", course.id)
    if (error) throw error
  }

  if (apply && product && product.granted_course_id !== course.id) {
    const { error } = await supabase
      .from("products")
      .update({
        granted_course_id: course.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id)
    if (error) throw error
  }

  const resourceReport = []

  if (apply) {
    await ensureBucket(supabase)
  }

  for (const entry of RESOURCE_KEYS) {
    const local = matchedResources.get(entry.key)
    const storagePath = `${COURSE_SLUG}/${entry.slug}/${local.name}`

    const row = {
      key: entry.key,
      slug: entry.slug,
      title: entry.title,
      localName: local.name,
      sizeBytes: local.sizeBytes,
      storagePath,
      action: dryRun ? "would_upload" : "pending",
    }

    if (dryRun) {
      resourceReport.push(row)
      continue
    }

    const { data: existingRows, error: existingError } = await supabase
      .from("course_resources")
      .select("id,storage_path,size_bytes")
      .eq("course_id", course.id)
      .eq("slug", entry.slug)
      .maybeSingle()
    if (existingError) throw existingError

    const { data: listed } = await supabase.storage
      .from(RESOURCES_BUCKET)
      .list(`${COURSE_SLUG}/${entry.slug}`, { search: local.name })
    const objectExists = (listed ?? []).some((item) => item.name === local.name)

    if (
      existingRows &&
      existingRows.size_bytes === local.sizeBytes &&
      objectExists
    ) {
      row.action = "reused"
    } else {
      const fileBody = readFileSync(local.pathname)
      const { error: uploadError } = await supabase.storage
        .from(RESOURCES_BUCKET)
        .upload(storagePath, fileBody, {
          contentType: entry.mimeType,
          upsert: true,
        })
      if (uploadError) throw uploadError
      row.action = objectExists ? "replaced" : "uploaded"
    }

    const payload = {
      course_id: course.id,
      slug: entry.slug,
      title: entry.title,
      description: null,
      file_name: entry.fileName,
      mime_type: entry.mimeType,
      size_bytes: local.sizeBytes,
      storage_bucket: RESOURCES_BUCKET,
      storage_path: storagePath,
      sort_order: entry.sortOrder,
      status: "published",
      updated_at: new Date().toISOString(),
    }

    if (existingRows) {
      const { error } = await supabase
        .from("course_resources")
        .update(payload)
        .eq("id", existingRows.id)
      if (error) throw error
      row.resourceId = existingRows.id
    } else {
      const { data: inserted, error } = await supabase
        .from("course_resources")
        .insert(payload)
        .select("id")
        .single()
      if (error) throw error
      row.resourceId = inserted.id
    }

    resourceReport.push(row)
  }

  console.log("VIDEO_REPORT")
  for (const row of videoReport) console.log(JSON.stringify(row))
  console.log("RESOURCE_REPORT")
  for (const row of resourceReport) console.log(JSON.stringify(row))

  console.log(
    JSON.stringify(
      {
        summary: {
          courseReused: true,
          courseSlug: COURSE_SLUG,
          courseId: course.id,
          videosProcessed: videoReport.length,
          resourcesProcessed: resourceReport.length,
          googleExportsNeeded: googleExportsNeeded.length,
          apply,
          dryRun,
          grantedCourseWired: Boolean(product),
        },
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
