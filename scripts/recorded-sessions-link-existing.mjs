#!/usr/bin/env node
/**
 * Idempotent linker for membership recorded sessions.
 *
 * Inventories local MP4s for identity matching only.
 * Discovers existing Mux assets / video rows.
 * Links into recorded_sessions — NEVER creates Mux uploads.
 *
 * Usage:
 *   node scripts/recorded-sessions-link-existing.mjs
 *   node scripts/recorded-sessions-link-existing.mjs --apply
 *   node scripts/recorded-sessions-link-existing.mjs --inventory-dir ~/Downloads/Breathwork
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { homedir } from "node:os"
import { resolve } from "node:path"
import { createClient } from "@supabase/supabase-js"
import Mux from "@mux/mux-node"

const DEFAULT_INVENTORY_DIR = resolve(homedir(), "Downloads/Breathwork")
const DURATION_TOLERANCE_SECONDS = 45

const INVENTORY_KEYS = [
  {
    key: "inner-child-healing",
    provisionalTitle: "Inner Child Healing",
    patterns: [/inner[_\s-]?child[_\s-]?healing\.mp4$/i],
  },
  {
    key: "manifestation-breathwork",
    provisionalTitle: "Manifestation Breathwork",
    patterns: [/manifestation[_\s-]?breathwork\.mp4$/i],
  },
  {
    key: "trauma-healing",
    provisionalTitle: "Trauma Healing",
    patterns: [/trauma[_\s-]?hea(?:l)?ing\.mp4$/i],
  },
  {
    key: "visualization-alignment",
    provisionalTitle: "Visualization",
    patterns: [/visualization[_\s-]*alignment\.mp4$/i],
  },
  {
    key: "activate-money-mindset",
    provisionalTitle: "Activate Money Mindset",
    patterns: [/activate[_\s-]?money[_\s-]?mindset\.mp4$/i],
  },
]

/** Confirmed upload batch — WAV/Money Mindset excluded until a real MP4 exists. */
const CONFIRMED_UPLOAD_KEYS = new Set([
  "inner-child-healing",
  "manifestation-breathwork",
  "trauma-healing",
  "visualization-alignment",
])

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

function matchKey(filename) {
  for (const entry of INVENTORY_KEYS) {
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

async function main() {
  const apply = hasArg("--apply")
  const inventoryDir = resolve(
    parseArgValue("--inventory-dir", DEFAULT_INVENTORY_DIR)
  )
  const env = { ...loadEnv(".env"), ...loadEnv(".env.local") }

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase env.")
  }
  if (!env.MUX_TOKEN_ID || !env.MUX_TOKEN_SECRET) {
    throw new Error("Missing Mux env.")
  }

  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", inventoryDir }, null, 2))

  if (!existsSync(inventoryDir)) {
    throw new Error(`Inventory directory not found: ${inventoryDir}`)
  }

  const files = readdirSync(inventoryDir)
  const mp4s = []
  const excluded = []
  for (const name of files) {
    const pathname = resolve(inventoryDir, name)
    if (!statSync(pathname).isFile()) continue
    const lower = name.toLowerCase()
    if (lower.endsWith(".m4a") || lower.endsWith(".wav")) {
      excluded.push({ name, reason: "audio_excluded" })
      continue
    }
    if (!lower.endsWith(".mp4")) continue
    const key = matchKey(name)
    const duration = readMp4DurationSeconds(pathname)
    mp4s.push({
      name,
      pathname,
      sizeBytes: statSync(pathname).size,
      durationSeconds: duration ? Math.round(duration) : null,
      inventoryKey: key?.key ?? null,
      provisionalTitle: key?.provisionalTitle ?? null,
    })
  }

  console.log("LOCAL_MP4_COUNT", mp4s.length)
  console.log("EXCLUDED_AUDIO", excluded)
  for (const file of mp4s) {
    console.log("LOCAL_MP4", JSON.stringify(file))
  }

  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  const { data: videos, error: videosError } = await supabase
    .from("videos")
    .select("id,title,mux_asset_id,mux_playback_id,status,duration_seconds")
    .not("mux_asset_id", "is", null)
  if (videosError) throw videosError

  const mux = new Mux({
    tokenId: env.MUX_TOKEN_ID,
    tokenSecret: env.MUX_TOKEN_SECRET,
  })
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

  console.log("EXISTING_VIDEOS_WITH_MUX", videos.length)
  console.log("EXISTING_MUX_ASSETS", assets.length)

  const { data: existingSessions, error: sessionsError } = await supabase
    .from("recorded_sessions")
    .select("id,slug,title,mux_asset_id,mux_playback_id,publication_status,processing_status")
  if (sessionsError) {
    console.log("RECORDED_SESSIONS_TABLE", {
      error: sessionsError.message,
      code: sessionsError.code,
    })
  } else {
    console.log("EXISTING_RECORDED_SESSIONS", existingSessions.length)
  }

  const report = []

  for (const key of INVENTORY_KEYS) {
    const local = mp4s.find((file) => file.inventoryKey === key.key) ?? null
    const videoMatch = (videos ?? []).find((video) => {
      const title = (video.title || "").toLowerCase()
      return (
        title.includes(key.key.replace(/-/g, " ")) ||
        title.includes(key.provisionalTitle.toLowerCase())
      )
    })
    const durationMatch = local?.durationSeconds
      ? findDurationMatch(
          assets.map((asset) => ({
            ...asset,
            duration: asset.duration,
          })),
          local.durationSeconds
        )
      : null

    const chosenAsset =
      (videoMatch?.mux_asset_id
        ? assets.find((asset) => asset.id === videoMatch.mux_asset_id)
        : null) ?? durationMatch

    const existing =
      (existingSessions ?? []).find((row) => row.slug === key.key) ??
      (chosenAsset
        ? (existingSessions ?? []).find((row) => row.mux_asset_id === chosenAsset.id)
        : null)

    const entry = {
      key: key.key,
      provisionalTitle: key.provisionalTitle,
      localMp4: local?.name ?? null,
      localDurationSeconds: local?.durationSeconds ?? null,
      matchedVideoId: videoMatch?.id ?? null,
      matchedMuxAssetId: chosenAsset?.id ?? null,
      matchedMuxPlaybackId:
        chosenAsset?.playbackId ?? videoMatch?.mux_playback_id ?? null,
      existingSessionId: existing?.id ?? null,
      action: "missing",
    }

    if (!CONFIRMED_UPLOAD_KEYS.has(key.key)) {
      entry.action = local ? "deferred_unconfirmed" : "skipped_no_mp4"
      report.push(entry)
      continue
    }

    if (!local) {
      entry.action = "missing_local_mp4"
      report.push(entry)
      continue
    }

    if (!chosenAsset || chosenAsset.status !== "ready" || !chosenAsset.playbackId) {
      entry.action = "missing_mux_asset"
      report.push(entry)
      continue
    }

    if (existing?.mux_asset_id === chosenAsset.id) {
      entry.action = "already_linked"
      report.push(entry)
      continue
    }

    entry.action = apply ? "link" : "would_link"
    report.push(entry)

    if (!apply) continue

    const payload = {
      slug: key.key,
      title: key.provisionalTitle,
      short_description: null,
      monthly_theme: null,
      week_number: null,
      weekly_topic: null,
      focus: null,
      duration_seconds: local.durationSeconds,
      mux_asset_id: chosenAsset.id,
      mux_playback_id: chosenAsset.playbackId,
      processing_status: "ready",
      publication_status: "draft",
      thumbnail_url: `https://image.mux.com/${chosenAsset.playbackId}/thumbnail.jpg`,
      display_order: 0,
    }

    if (existing) {
      const { error } = await supabase
        .from("recorded_sessions")
        .update(payload)
        .eq("id", existing.id)
      if (error) throw error
      entry.existingSessionId = existing.id
      entry.action = "linked_update"
    } else {
      const { data, error } = await supabase
        .from("recorded_sessions")
        .insert(payload)
        .select("id")
        .single()
      if (error) throw error
      entry.existingSessionId = data.id
      entry.action = "linked_insert"
    }
  }

  console.log("LINK_REPORT")
  for (const row of report) {
    console.log(JSON.stringify(row))
  }

  const linked = report.filter((row) =>
    ["already_linked", "linked_update", "linked_insert", "would_link", "link"].includes(
      row.action
    )
  )
  const missing = report.filter((row) =>
    ["missing_local_mp4", "missing_mux_asset"].includes(row.action)
  )

  console.log(
    JSON.stringify(
      {
        summary: {
          inventoryKeys: INVENTORY_KEYS.length,
          localMp4s: mp4s.length,
          linkedOrReady: linked.length,
          missing: missing.length,
          apply,
          note:
            "Curriculum metadata left unset. Provisional titles are identity labels only; publish after editorial confirmation.",
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
