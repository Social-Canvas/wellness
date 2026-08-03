import { createHash } from "node:crypto"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { basename, join } from "node:path"

/** Keep aligned with EXPECTED_SOURCE_COUNT (avoid .ts import cycles in node:test). */
const EXPECTED_SOURCE_COUNT = 6

export type InventoryVideoFile = {
  filename: string
  absolutePath: string
  sizeBytes: number
  sha256: string
  width: number
  height: number
  durationSeconds: number | null
  hasAudio: boolean
  codec: string | null
  isPortrait: boolean
  aspectRatio: number
}

export type InventoryResult =
  | { ok: true; files: InventoryVideoFile[] }
  | { ok: false; errors: string[]; files: InventoryVideoFile[] }

function sha256File(absolutePath: string): string {
  const hash = createHash("sha256")
  hash.update(readFileSync(absolutePath))
  return hash.digest("hex")
}

function parseBoxes(
  data: Buffer,
  start = 0,
  end = data.length
): Array<{ type: string; start: number; size: number; header: number }> {
  const out: Array<{ type: string; start: number; size: number; header: number }> =
    []
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
    if (
      type === "moov" ||
      type === "trak" ||
      type === "mdia" ||
      type === "minf" ||
      type === "stbl"
    ) {
      out.push(...parseBoxes(data, pos + header, pos + size))
    }
    pos += size
  }
  return out
}

function readVisualSampleDims(data: Buffer): {
  width: number
  height: number
  codec: string | null
} {
  const codecs = ["avc1", "hvc1", "hev1", "av01", "mp4v"] as const
  for (let i = 0; i < data.length - 32; i += 1) {
    const fourcc = data.subarray(i, i + 4).toString("latin1")
    if (!(codecs as readonly string[]).includes(fourcc)) continue
    const boxStart = i - 4
    const width = data.readUInt16BE(boxStart + 8 + 24)
    const height = data.readUInt16BE(boxStart + 8 + 26)
    if (width > 0 && height > 0) {
      return { width, height, codec: fourcc }
    }
  }
  return { width: 0, height: 0, codec: null }
}

function readDurationsAndAudio(data: Buffer): {
  durationSeconds: number | null
  hasAudio: boolean
} {
  const boxes = parseBoxes(data)
  let durationSeconds: number | null = null
  let hasAudio = false

  for (const box of boxes) {
    if (box.type === "mdhd") {
      const body = box.start + box.header
      const version = data[body]
      if (version === 1) {
        const timescale = data.readUInt32BE(body + 20)
        const duration = Number(data.readBigUInt64BE(body + 24))
        if (timescale > 0) {
          const seconds = duration / timescale
          if (!durationSeconds || seconds > durationSeconds) {
            durationSeconds = seconds
          }
        }
      } else {
        const timescale = data.readUInt32BE(body + 12)
        const duration = data.readUInt32BE(body + 16)
        if (timescale > 0) {
          const seconds = duration / timescale
          if (!durationSeconds || seconds > durationSeconds) {
            durationSeconds = seconds
          }
        }
      }
    }
    if (box.type === "hdlr") {
      const handler = data
        .subarray(box.start + box.header + 8, box.start + box.header + 12)
        .toString("latin1")
      if (handler === "soun") hasAudio = true
    }
    if (box.type === "mp4a" || box.type === "soun") {
      hasAudio = true
    }
  }

  return { durationSeconds, hasAudio }
}

export function inspectMp4File(absolutePath: string): InventoryVideoFile {
  const data = readFileSync(absolutePath)
  const { width, height, codec } = readVisualSampleDims(data)
  const { durationSeconds, hasAudio } = readDurationsAndAudio(data)
  const aspectRatio = height > 0 ? width / height : 0
  const isPortrait = height > width && width > 0

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
    isPortrait,
    aspectRatio,
  }
}

/**
 * Allowlist inventory for homepage testimonials upload.
 * Requires exactly six readable portrait MP4s with unique checksums.
 */
export function inventoryTestimonialSources(
  directoryPath: string
): InventoryResult {
  const errors: string[] = []
  let entries: string[] = []

  try {
    entries = readdirSync(directoryPath)
  } catch {
    return {
      ok: false,
      errors: [`Unable to read testimonials directory: ${directoryPath}`],
      files: [],
    }
  }

  const mp4Names = entries
    .filter((name) => name.toLowerCase().endsWith(".mp4"))
    .sort((a, b) => a.localeCompare(b))

  if (mp4Names.length !== EXPECTED_SOURCE_COUNT) {
    errors.push(
      `Expected exactly ${EXPECTED_SOURCE_COUNT} MP4 files, found ${mp4Names.length}.`
    )
  }

  const files: InventoryVideoFile[] = []
  for (const name of mp4Names) {
    const absolutePath = join(directoryPath, name)
    try {
      const inspected = inspectMp4File(absolutePath)
      files.push(inspected)
      if (!inspected.isPortrait) {
        errors.push(`${name}: expected portrait orientation, got ${inspected.width}x${inspected.height}.`)
      }
      if (!inspected.codec) {
        errors.push(`${name}: unable to detect video codec.`)
      }
      if (!inspected.hasAudio) {
        errors.push(`${name}: no audio track detected.`)
      }
      if (!inspected.durationSeconds || inspected.durationSeconds < 1) {
        errors.push(`${name}: invalid or missing duration.`)
      }
      if (inspected.sizeBytes < 1000) {
        errors.push(`${name}: file appears corrupt or empty.`)
      }
    } catch (error) {
      errors.push(
        `${name}: failed to inspect (${error instanceof Error ? error.message : "unknown"}).`
      )
    }
  }

  const byHash = new Map<string, string[]>()
  for (const file of files) {
    const list = byHash.get(file.sha256) ?? []
    list.push(file.filename)
    byHash.set(file.sha256, list)
  }
  for (const [, names] of byHash) {
    if (names.length > 1) {
      errors.push(`Duplicate checksum for: ${names.join(", ")}`)
    }
  }

  if (files.length !== EXPECTED_SOURCE_COUNT) {
    // Already covered by count check when listing differs; keep explicit.
  }

  return {
    ok: errors.length === 0 && files.length === EXPECTED_SOURCE_COUNT,
    errors,
    files,
  }
}

/** Ordered allowlist filenames for the six portrait sources (alphabetical). */
export function allowlistedSourceFilenames(
  files: readonly InventoryVideoFile[]
): string[] {
  return files.map((file) => file.filename)
}
