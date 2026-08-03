/**
 * Upload allowlisted homepage testimonial MP4s to Mux with public playback.
 *
 * Usage:
 *   node scripts/upload-homepage-testimonials.mjs --dry-run
 *   node scripts/upload-homepage-testimonials.mjs --i-confirm-publication-permission
 *
 * Does not commit media. Does not touch membership / signed lesson videos.
 * Refuses to upload unless publication permission is explicitly confirmed.
 */

import { createHash } from "node:crypto"
import {
  createReadStream,
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { homedir } from "node:os"
import { basename, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import Mux from "@mux/mux-node"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const DEFAULT_DIR = join(homedir(), "Downloads", "testimonials")
const MANIFEST_PATH = join(
  ROOT,
  "src/features/marketing-testimonials/data/mux-upload-manifest.json"
)
const EXPECTED_COUNT = 6

function loadEnv() {
  const env = { ...process.env }
  const envPath = join(ROOT, ".env.local")
  if (!existsSync(envPath)) return env
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    if (!line || line.startsWith("#")) continue
    const index = line.indexOf("=")
    if (index === -1) continue
    const key = line.slice(0, index)
    const value = line.slice(index + 1)
    if (!(key in env)) env[key] = value
  }
  return env
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

function parseBoxes(data, start = 0, end = data.length) {
  const out = []
  let pos = start
  while (pos + 8 <= end) {
    let size = data.readUInt32BE(pos)
    const type = data.subarray(pos + 4, pos + 8).toString("latin1")
    let header = 8
    if (size === 1) {
      if (pos + 16 > end) break
      size = Number(data.readBigUInt64BE(pos + 8))
      header = 16
    } else if (size === 0) {
      size = end - pos
    }
    if (size < header || pos + size > end) break
    out.push({ type, start: pos, size, header })
    if (["moov", "trak", "mdia", "minf", "stbl"].includes(type)) {
      out.push(...parseBoxes(data, pos + header, pos + size))
    }
    pos += size
  }
  return out
}

function inspectMp4(absolutePath) {
  const data = readFileSync(absolutePath)
  let width = 0
  let height = 0
  let codec = null
  for (const fourcc of ["avc1", "hvc1", "hev1", "av01", "mp4v"]) {
    for (let i = 0; i < data.length - 32; i += 1) {
      if (data.subarray(i, i + 4).toString("latin1") !== fourcc) continue
      const boxStart = i - 4
      width = data.readUInt16BE(boxStart + 8 + 24)
      height = data.readUInt16BE(boxStart + 8 + 26)
      if (width > 0 && height > 0) {
        codec = fourcc
        break
      }
    }
    if (codec) break
  }

  let durationSeconds = null
  let hasAudio = false
  for (const box of parseBoxes(data)) {
    if (box.type === "mdhd") {
      const body = box.start + box.header
      const version = data[body]
      const timescale =
        version === 1 ? data.readUInt32BE(body + 20) : data.readUInt32BE(body + 12)
      const duration =
        version === 1
          ? Number(data.readBigUInt64BE(body + 24))
          : data.readUInt32BE(body + 16)
      if (timescale > 0) {
        const seconds = duration / timescale
        if (!durationSeconds || seconds > durationSeconds) durationSeconds = seconds
      }
    }
    if (box.type === "hdlr") {
      const handler = data
        .subarray(box.start + box.header + 8, box.start + box.header + 12)
        .toString("latin1")
      if (handler === "soun") hasAudio = true
    }
    if (box.type === "mp4a" || box.type === "soun") hasAudio = true
  }

  return {
    filename: basename(absolutePath),
    absolutePath,
    sizeBytes: statSync(absolutePath).size,
    sha256: sha256File(absolutePath),
    width,
    height,
    durationSeconds,
    hasAudio,
    codec,
    isPortrait: height > width && width > 0,
  }
}

function inventory(directoryPath) {
  const errors = []
  let names = []
  try {
    names = readdirSync(directoryPath)
      .filter((name) => name.toLowerCase().endsWith(".mp4"))
      .sort((a, b) => a.localeCompare(b))
  } catch {
    return { ok: false, errors: [`Unable to read ${directoryPath}`], files: [] }
  }

  if (names.length !== EXPECTED_COUNT) {
    errors.push(`Expected exactly ${EXPECTED_COUNT} MP4 files, found ${names.length}.`)
  }

  const files = []
  for (const name of names) {
    const absolutePath = join(directoryPath, name)
    try {
      const file = inspectMp4(absolutePath)
      files.push(file)
      if (!file.isPortrait) {
        errors.push(`${name}: expected portrait, got ${file.width}x${file.height}`)
      }
      if (!file.codec) errors.push(`${name}: codec undetectable`)
      if (!file.hasAudio) errors.push(`${name}: no audio track`)
      if (!file.durationSeconds || file.durationSeconds < 1) {
        errors.push(`${name}: invalid duration`)
      }
      if (file.sizeBytes < 1000) errors.push(`${name}: appears empty/corrupt`)
    } catch (error) {
      errors.push(`${name}: ${error instanceof Error ? error.message : "inspect failed"}`)
    }
  }

  const byHash = new Map()
  for (const file of files) {
    const list = byHash.get(file.sha256) ?? []
    list.push(file.filename)
    byHash.set(file.sha256, list)
  }
  for (const namesForHash of byHash.values()) {
    if (namesForHash.length > 1) {
      errors.push(`Duplicate checksum: ${namesForHash.join(", ")}`)
    }
  }

  return {
    ok: errors.length === 0 && files.length === EXPECTED_COUNT,
    errors,
    files,
  }
}

function getPublicPlaybackId(asset) {
  const playbackIds = asset.playback_ids ?? []
  const publicId = playbackIds.find((item) => item.policy === "public")
  return publicId?.id ?? playbackIds[0]?.id ?? null
}

async function waitForAssetReady(mux, assetId, maxAttempts = 60) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const asset = await mux.video.assets.retrieve(assetId)
    if (asset.status === "ready") return asset
    if (asset.status === "errored") {
      throw new Error(`Mux asset errored: ${JSON.stringify(asset.errors ?? [])}`)
    }
    console.log(`  waiting (${attempt}/${maxAttempts}): ${asset.status}`)
    await sleep(5000)
  }
  throw new Error(`Timed out waiting for asset ${assetId}`)
}

async function uploadFile(mux, absolutePath, passthrough) {
  const upload = await mux.video.uploads.create({
    cors_origin: "*",
    new_asset_settings: {
      playback_policy: ["public"],
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

  for (let attempt = 1; attempt <= 40; attempt += 1) {
    const current = await mux.video.uploads.retrieve(upload.id)
    if (current.asset_id) return current.asset_id
    if (current.status === "errored" || current.error) {
      throw new Error(`Upload errored for ${basename(absolutePath)}`)
    }
    await sleep(3000)
  }
  throw new Error(`Timed out resolving asset for upload ${upload.id}`)
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const dryRun = args.has("--dry-run")
  const permissionConfirmed = args.has("--i-confirm-publication-permission")
  const directory = DEFAULT_DIR

  console.log("Homepage testimonials Mux upload")
  console.log(`  source dir: ${directory}`)
  console.log(
    `  mode: ${dryRun ? "dry-run" : permissionConfirmed ? "upload" : "blocked"}`
  )

  const result = inventory(directory)
  for (const file of result.files) {
    console.log(
      `  - ${file.filename} ${file.width}x${file.height} ${file.durationSeconds?.toFixed(1)}s sha=${file.sha256.slice(0, 12)}… audio=${file.hasAudio}`
    )
  }

  if (!result.ok) {
    console.error("Inventory failed:")
    for (const error of result.errors) console.error(`  • ${error}`)
    process.exitCode = 1
    return
  }

  if (dryRun) {
    console.log("Dry run OK — exactly six unique portrait MP4s ready.")
    console.log(
      "Upload blocked until --i-confirm-publication-permission is provided (client consent)."
    )
    return
  }

  if (!permissionConfirmed) {
    console.error(
      "Refusing upload: publication permission is not confirmed.\n" +
        "Re-run with --i-confirm-publication-permission only after client consent."
    )
    process.exitCode = 2
    return
  }

  const env = loadEnv()
  if (!env.MUX_TOKEN_ID || !env.MUX_TOKEN_SECRET) {
    console.error("Missing MUX_TOKEN_ID / MUX_TOKEN_SECRET.")
    process.exitCode = 1
    return
  }

  const mux = new Mux({
    tokenId: env.MUX_TOKEN_ID,
    tokenSecret: env.MUX_TOKEN_SECRET,
  })

  const manifest = {
    generatedAt: new Date().toISOString(),
    policy: "public",
    note: "Asset IDs are operational only — never render them in the public UI.",
    items: [],
  }

  for (const [index, file] of result.files.entries()) {
    const storyId = `member-story-${index + 1}`
    console.log(`Uploading ${file.filename} → ${storyId}`)
    const assetId = await uploadFile(mux, file.absolutePath, {
      purpose: "homepage_testimonial",
      story_id: storyId,
      source_sha256: file.sha256,
    })
    const asset = await waitForAssetReady(mux, assetId)
    const playbackId = getPublicPlaybackId(asset)
    if (!playbackId) throw new Error(`No public playback ID for asset ${assetId}`)
    const posterUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?width=540&height=960&fit_mode=smartcrop&time=1`
    manifest.items.push({
      id: storyId,
      sortOrder: index + 1,
      muxPlaybackId: playbackId,
      muxAssetId: assetId,
      posterUrl,
      sourceSha256: file.sha256,
      sourceFilenameOpsOnly: file.filename,
    })
    console.log(`  ready playback=${playbackId}`)
  }

  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`Wrote ${MANIFEST_PATH}`)
  console.log(
    "Next: copy playback IDs/posters into testimonials.ts after client approves names + consent; set publicationStatus to published."
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
