import assert from "node:assert/strict"
import { test } from "node:test"

import {
  buildMuxThumbnailUrl,
  resolveMediaThumbnail,
  resolveSafeMediaUrl,
} from "./resolve-media-thumbnail.ts"

test("accepts https URLs", () => {
  assert.equal(
    resolveSafeMediaUrl(" https://image.mux.com/abc/thumbnail.jpg "),
    "https://image.mux.com/abc/thumbnail.jpg"
  )
})

test("rejects empty and non-http values", () => {
  assert.equal(resolveSafeMediaUrl(""), null)
  assert.equal(resolveSafeMediaUrl(null), null)
  assert.equal(resolveSafeMediaUrl("javascript:alert(1)"), null)
  assert.equal(resolveSafeMediaUrl("/relative.jpg"), null)
})

test("prefers explicit thumbnail URL", () => {
  const result = resolveMediaThumbnail({
    thumbnailUrl: "https://cdn.example.com/thumb.jpg",
    muxPlaybackId: "playback123",
  })
  assert.deepEqual(result, {
    kind: "url",
    src: "https://cdn.example.com/thumb.jpg",
  })
})

test("falls back to Mux poster from playback ID", () => {
  const result = resolveMediaThumbnail({
    thumbnailUrl: null,
    muxPlaybackId: "playback123",
  })
  assert.equal(result.kind, "url")
  if (result.kind === "url") {
    assert.match(result.src, /image\.mux\.com\/playback123\/thumbnail\.jpg/)
  }
})

test("returns fallback when nothing available", () => {
  assert.deepEqual(
    resolveMediaThumbnail({ thumbnailUrl: "  ", muxPlaybackId: null }),
    { kind: "fallback" }
  )
})

test("builds smartcrop poster URL", () => {
  const url = buildMuxThumbnailUrl("abc", { width: 320, height: 180, time: 2 })
  assert.equal(
    url,
    "https://image.mux.com/abc/thumbnail.jpg?width=320&height=180&fit_mode=smartcrop&time=2"
  )
})
