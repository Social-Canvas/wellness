#!/usr/bin/env node
/**
 * Upload allowlisted membership recorded-session MP4s to Mux (signed playback)
 * and upsert published `recorded_sessions` rows.
 *
 * Idempotent: reuses existing Mux assets / session rows when present.
 * Never uploads WAV/m4a. Never invents curriculum theme/week/focus.
 * Does not touch Reset lessons, testimonials, or Stripe.
 *
 * Usage:
 *   node scripts/recorded-sessions-upload.mjs --dry-run
 *   node scripts/recorded-sessions-upload.mjs --apply
 *   node scripts/recorded-sessions-upload.mjs --apply --inventory-dir ~/Downloads/Breathwork
 */

import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { homedir } from "node:os"
import { basename, resolve } from "node:path"
import { createClient } from "@supabase/supabase-js"
import Mux from "@mux/mux-node"

const DEFAULT_INVENTORY_DIR = resolve(homedir(), "Downloads/Breathwork")
const DURATION_TOLERANCE_SECONDS = 45
const EXPECTED_UPLOAD_COUNT = 4

/** Confirmed batch only — Money Mindset WAV excluded; no 5th MP4. */
const UPLOAD_KEYS = [
  {
    key: "inner-child-healing",
    title: "Inner Child Healing",
    patterns: [/inner[_\s-]?child[_\s-]?healing\.mp4$/i],
  },
  {
    key: "manifestation-breathwork",
    title: "Manifestation Breathwork",
    patterns: [/manifestation[_\s-]?breathwork\.mp4$/i],
  },
  {
    key: "trauma-healing",
    title: "Trauma Healing",
    patterns: [/trauma[_\s-]?hea(?:l)?ing\.mp4$/i],
  },
  {
    key: "visualization-alignment",
    title: "Visualization",
    patterns: [/visualization[_\s-]*alignment\.mp4$/i],
  },
]

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
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function matchKey(filename) {
  for (const entry of UPLOAD_KEYS) {
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

function findDurationMatch(candidates, targetSeconds) {
  let best = null
  let bestDelta = Number.POSITIVE_INFINITY
  for (const candidate of candidates) {
    if (typeof candidate.duration !== "number") continue
    const delta = Math.abs(candidate.duration - targetSeconds)
    if (delta <= DURATION_TOLERANCE_SECONDS && delta < bestDelta) {
      best = candidate
      bestDelta = delta
    }
  }
  return best
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

async function main() {
  const apply = hasArg("--apply")
  const dryRun = hasArg("--dry-run") || !apply
  const inventoryDir = resolve(
    parseArgValue("--inventory-dir", DEFAULT_INVENTORY_DIR)
  )
  const pollIntervalMs = Number.parseInt(parseArgValue("--poll-interval-ms", "5000"), 10)
  const maxPolls = Number.parseInt(parseArgValue("--max-polls", "120"), 10)

  const env = { ...loadEnv(".env"), ...loadEnv(".env.local") }

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        inventoryDir,
        expectedCount: EXPECTED_UPLOAD_COUNT,
      },
      null,
      2
    )
  )

  if (!existsSync(inventoryDir)) {
    throw new Error(`Inventory directory not found: ${inventoryDir}`)
  }

  const excluded = []
  const unmatchedMp4s = []
  const matched = new Map()

  for (const name of readdirSync(inventoryDir)) {
    const pathname = resolve(inventoryDir, name)
    if (!statSync(pathname).isFile()) continue
    const lower = name.toLowerCase()
    if (lower.endsWith(".m4a") || lower.endsWith(".wav")) {
      excluded.push({ name, reason: "audio_excluded" })
      continue
    }
    if (!lower.endsWith(".mp4")) continue
    const key = matchKey(name)
    if (!key) {
      unmatchedMp4s.push(name)
      continue
    }
    if (matched.has(key.key)) {
      throw new Error(`Duplicate match for ${key.key}: ${matched.get(key.key).name} and ${name}`)
    }
    const duration = readMp4DurationSeconds(pathname)
    matched.set(key.key, {
      name,
      pathname,
      sizeBytes: statSync(pathname).size,
      durationSeconds: duration ? Math.round(duration) : null,
      key: key.key,
      title: key.title,
    })
  }

  console.log("EXCLUDED_AUDIO", excluded)
  if (unmatchedMp4s.length) {
    console.log("UNMATCHED_MP4_SKIPPED", unmatchedMp4s)
  }

  const files = UPLOAD_KEYS.map((entry) => matched.get(entry.key) ?? null)
  for (const file of files) {
    if (file) console.log("LOCAL_MP4", JSON.stringify(file))
  }

  const missingLocal = UPLOAD_KEYS.filter((entry) => !matched.has(entry.key)).map(
    (entry) => entry.key
  )
  if (missingLocal.length || matched.size !== EXPECTED_UPLOAD_COUNT) {
    throw new Error(
      `Expected exactly ${EXPECTED_UPLOAD_COUNT} allowlisted MP4s. missing=${JSON.stringify(missingLocal)} matched=${matched.size}`
    )
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

  const { data: existingSessions, error: sessionsError } = await supabase
    .from("recorded_sessions")
    .select(
      "id,slug,title,mux_asset_id,mux_playback_id,publication_status,processing_status"
    )
  if (sessionsError) throw sessionsError

  console.log("EXISTING_MUX_ASSETS", assets.length)
  console.log("EXISTING_RECORDED_SESSIONS", existingSessions?.length ?? 0)

  const report = []

  for (const entry of UPLOAD_KEYS) {
    const local = matched.get(entry.key)
    const existing =
      (existingSessions ?? []).find((row) => row.slug === entry.key) ?? null

    let chosen =
      (existing?.mux_asset_id
        ? assets.find((asset) => asset.id === existing.mux_asset_id)
        : null) ??
      findDurationMatch(assets, local.durationSeconds ?? -1)

    // Prefer passthrough match when present.
    const passthroughMatch = assets.find((asset) => {
      if (!asset.passthrough) return false
      try {
        const parsed = JSON.parse(asset.passthrough)
        return parsed?.recorded_session_slug === entry.key
      } catch {
        return false
      }
    })
    if (passthroughMatch) chosen = passthroughMatch

    const row = {
      key: entry.key,
      title: entry.title,
      localMp4: local.name,
      localDurationSeconds: local.durationSeconds,
      muxAssetId: chosen?.id ?? null,
      muxPlaybackId: chosen?.playbackId ?? existing?.mux_playback_id ?? null,
      existingSessionId: existing?.id ?? null,
      action: "pending",
    }

    const readyExisting =
      chosen &&
      chosen.status === "ready" &&
      chosen.playbackId

    if (readyExisting) {
      row.muxAssetId = chosen.id
      row.muxPlaybackId = chosen.playbackId
      row.action = apply ? "link_existing" : "would_link_existing"
    } else if (dryRun) {
      row.action = "would_upload"
      report.push(row)
      continue
    } else {
      console.log(`Uploading ${local.name} → ${entry.key} (${local.sizeBytes} bytes)`)
      const { assetId } = await uploadLocalMp4(
        mux,
        local.pathname,
        {
          purpose: "recorded_session",
          recorded_session_slug: entry.key,
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
      report.push(row)
      continue
    }

    if (!row.muxAssetId || !row.muxPlaybackId) {
      throw new Error(`Missing Mux IDs for ${entry.key}`)
    }

    const payload = {
      slug: entry.key,
      title: entry.title,
      short_description: null,
      monthly_theme: null,
      week_number: null,
      weekly_topic: null,
      focus: null,
      duration_seconds: local.durationSeconds,
      mux_asset_id: row.muxAssetId,
      mux_playback_id: row.muxPlaybackId,
      processing_status: "ready",
      publication_status: "published",
      published_at: new Date().toISOString(),
      thumbnail_url: `https://image.mux.com/${row.muxPlaybackId}/thumbnail.jpg`,
      display_order: 0,
      presenter: "Dr. Deepa Pattani",
    }

    if (existing) {
      const { error } = await supabase
        .from("recorded_sessions")
        .update(payload)
        .eq("id", existing.id)
      if (error) throw error
      row.existingSessionId = existing.id
      row.action =
        row.action === "uploaded" ? "uploaded_and_published" : "linked_and_published"
    } else {
      const { data, error } = await supabase
        .from("recorded_sessions")
        .insert(payload)
        .select("id")
        .single()
      if (error) throw error
      row.existingSessionId = data.id
      row.action =
        row.action === "uploaded" ? "uploaded_and_published" : "linked_and_published"
    }

    report.push(row)
  }

  console.log("UPLOAD_REPORT")
  for (const row of report) {
    console.log(JSON.stringify(row))
  }

  console.log(
    JSON.stringify(
      {
        summary: {
          expected: EXPECTED_UPLOAD_COUNT,
          processed: report.length,
          apply,
          dryRun,
          note:
            "Curriculum metadata left null. Titles are identity labels only. Money Mindset WAV excluded.",
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
