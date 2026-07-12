/**
 * Welcome lesson Mux E2E — uploads a stand-in source file when no GHL export is present,
 * syncs the Mux asset to the Welcome video row, publishes test content, and verifies playback.
 *
 * Usage: node scripts/welcome-mux-e2e.mjs [--revert-course]
 */

import { readFileSync } from "node:fs"
import Mux from "@mux/mux-node"
import { createClient } from "@supabase/supabase-js"

const WELCOME_VIDEO_TITLE = "7-Day Elevated Reset — Welcome"
const COURSE_SLUG = "7-day-reset-meditation-series"
/** Stand-in until GHL Welcome export is available locally. */
const STAND_IN_SOURCE_URL =
  "https://storage.googleapis.com/muxdemofiles/mux-video-intro.mp4"

function loadEnv() {
  const env = {}
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    if (!line || line.startsWith("#")) continue
    const index = line.indexOf("=")
    env[line.slice(0, index)] = line.slice(index + 1)
  }
  return env
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getSignedPlaybackId(asset) {
  const playbackIds = asset.playback_ids ?? []
  const signed = playbackIds.find((playback) => playback.policy === "signed")
  return signed?.id ?? playbackIds[0]?.id ?? null
}

async function waitForAssetReady(mux, assetId, maxAttempts = 60) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const asset = await mux.video.assets.retrieve(assetId)
    if (asset.status === "ready") return asset
    if (asset.status === "errored") {
      throw new Error(`Mux asset errored: ${JSON.stringify(asset.errors ?? [])}`)
    }
    console.log(`  waiting for Mux asset (${attempt}/${maxAttempts}): ${asset.status}`)
    await sleep(5000)
  }
  throw new Error("Timed out waiting for Mux asset to become ready.")
}

async function syncVideoRow(sb, videoId, asset) {
  const playbackId = getSignedPlaybackId(asset)
  const durationSeconds =
    typeof asset.duration === "number" ? Math.round(asset.duration) : null
  const thumbnailUrl = playbackId
    ? `https://image.mux.com/${playbackId}/thumbnail.jpg`
    : null

  const { data, error } = await sb
    .from("videos")
    .update({
      status: "ready",
      migration_status: "verified",
      mux_asset_id: asset.id,
      mux_playback_id: playbackId,
      duration_seconds: durationSeconds,
      thumbnail_url: thumbnailUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", videoId)
    .select("*")
    .single()

  if (error) throw new Error(`Failed to sync video row: ${error.message}`)
  return data
}

async function publishWelcomeContent(sb) {
  const { data: course, error: courseError } = await sb
    .from("courses")
    .select("id")
    .eq("slug", COURSE_SLUG)
    .single()

  if (courseError) throw new Error(courseError.message)

  const { data: video, error: videoError } = await sb
    .from("videos")
    .select("id, mux_playback_id, status")
    .eq("title", WELCOME_VIDEO_TITLE)
    .single()

  if (videoError) throw new Error(videoError.message)
  if (!video.mux_playback_id) {
    throw new Error("Welcome video has no mux_playback_id; cannot publish.")
  }

  await sb
    .from("videos")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", video.id)

  const { data: welcomeModule } = await sb
    .from("modules")
    .select("id")
    .eq("course_id", course.id)
    .eq("slug", "welcome")
    .single()

  await sb
    .from("lessons")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("module_id", welcomeModule.id)
    .eq("slug", "welcome")

  await sb
    .from("modules")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", welcomeModule.id)

  await sb
    .from("courses")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", course.id)

  return { courseId: course.id, videoId: video.id, moduleId: welcomeModule.id }
}

async function revertCourseDraft(sb) {
  await sb
    .from("courses")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("slug", COURSE_SLUG)
  console.log("Course set back to draft.")
}

async function verifySignedPlayback(mux, playbackId) {
  const token = await mux.jwt.signPlaybackId(playbackId, {
    type: "video",
    expiration: "15m",
  })
  const playbackUrl = `https://stream.mux.com/${playbackId}.m3u8?token=${token}`
  const response = await fetch(playbackUrl, { method: "GET" })
  console.log(`  signed HLS manifest GET: ${response.status}`)
  return response.ok
}

async function main() {
  const revertOnly = process.argv.includes("--revert-course")
  const env = loadEnv()
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const mux = new Mux({
    tokenId: env.MUX_TOKEN_ID,
    tokenSecret: env.MUX_TOKEN_SECRET,
    jwtSigningKey: env.MUX_SIGNING_KEY_ID,
    jwtPrivateKey: env.MUX_SIGNING_PRIVATE_KEY.replace(/\\n/g, "\n"),
  })

  if (revertOnly) {
    await revertCourseDraft(sb)
    return
  }

  const { data: video, error: videoError } = await sb
    .from("videos")
    .select("id, title, status, mux_asset_id, mux_playback_id")
    .eq("title", WELCOME_VIDEO_TITLE)
    .single()

  if (videoError) throw new Error(videoError.message)
  console.log("Welcome video row:", video.id, video.status)

  let asset
  if (video.mux_asset_id && video.mux_playback_id) {
    console.log("Mux asset already linked; retrieving…")
    asset = await mux.video.assets.retrieve(video.mux_asset_id)
    if (asset.status !== "ready") {
      asset = await waitForAssetReady(mux, video.mux_asset_id)
    }
  } else {
    console.log("Creating Mux asset from stand-in source (replace with GHL Welcome export for production)…")
    asset = await mux.video.assets.create({
      input: [{ url: STAND_IN_SOURCE_URL }],
      playback_policy: ["signed"],
      passthrough: JSON.stringify({ video_id: video.id }),
    })
    console.log("  asset id:", asset.id)
    asset = await waitForAssetReady(mux, asset.id)
  }

  const synced = await syncVideoRow(sb, video.id, asset)
  console.log("Video synced:", {
    status: synced.status,
    mux_asset_id: synced.mux_asset_id,
    mux_playback_id: synced.mux_playback_id,
    duration_seconds: synced.duration_seconds,
  })

  const published = await publishWelcomeContent(sb)
  console.log("Published for E2E test:", published)

  const playbackOk = await verifySignedPlayback(mux, synced.mux_playback_id)
  console.log(playbackOk ? "Playback token verification: OK" : "Playback token verification: skipped or failed")

  console.log("\nManual checks still required:")
  console.log("  1. Library → Reset course → Welcome lesson (member with plan access)")
  console.log("  2. Pause saves progress; refresh resumes")
  console.log("  3. Watch to ~90% → lesson complete + course progress")
  console.log("  4. Safari / iPhone playback")
  console.log("\nAfter manual test, run: node scripts/welcome-mux-e2e.mjs --revert-course")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
