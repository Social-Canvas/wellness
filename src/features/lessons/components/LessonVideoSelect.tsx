"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"

import { Input, Label } from "@/components/ui"
import { cn } from "@/lib/utils"

import type { LessonVideoOption } from "./lesson-video-utils"
import { lessonSelectClassName } from "./lesson-form-styles"

interface LessonVideoSelectProps {
  id?: string
  label?: string
  value: string | null
  onChange: (value: string | null) => void
  videos: LessonVideoOption[]
  disabled?: boolean
  invalid?: boolean
}

export function LessonVideoSelect({
  id,
  label = "Video",
  value,
  onChange,
  videos,
  disabled = false,
  invalid = false,
}: LessonVideoSelectProps) {
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const selectedVideo = useMemo(
    () => videos.find((video) => video.id === value) ?? null,
    [value, videos]
  )

  const filteredVideos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return videos
    }

    return videos.filter((video) =>
      video.title.toLowerCase().includes(normalizedQuery)
    )
  }, [query, videos])

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery("")
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [open])

  function handleSelect(videoId: string | null) {
    onChange(videoId)
    setOpen(false)
    setQuery("")
  }

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {value ? (
          <button
            type="button"
            className="text-xs font-semibold text-blue hover:text-blue-deep disabled:opacity-60"
            disabled={disabled}
            onClick={() => handleSelect(null)}
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="relative">
        <button
          id={id}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          disabled={disabled}
          className={cn(
            lessonSelectClassName,
            "flex items-center justify-between text-left",
            invalid && "border-destructive ring-3 ring-destructive/20"
          )}
          onClick={() => {
            if (disabled) {
              return
            }

            setOpen((current) => !current)
          }}
        >
          <span className={selectedVideo ? "text-ink" : "text-ink-soft"}>
            {selectedVideo?.title ?? "No video attached"}
          </span>
          <span className="text-xs text-ink-soft">{open ? "▲" : "▼"}</span>
        </button>

        {open ? (
          <div className="absolute z-50 mt-2 w-full rounded-[var(--radius-input)] border border-line bg-surface p-2 shadow-lg">
            <Input
              type="search"
              placeholder="Search videos…"
              value={query}
              autoFocus
              disabled={disabled}
              onChange={(event) => setQuery(event.target.value)}
            />

            <ul
              id={listboxId}
              role="listbox"
              aria-label="Videos"
              className="mt-2 max-h-48 overflow-y-auto"
            >
              <li role="option" aria-selected={value === null}>
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-[calc(var(--radius-input)-2px)] px-3 py-2 text-left text-sm transition-colors hover:bg-cream2",
                    value === null && "bg-blue-soft font-medium text-ink"
                  )}
                  onClick={() => handleSelect(null)}
                >
                  No video attached
                </button>
              </li>

              {filteredVideos.length === 0 ? (
                <li className="px-3 py-2 text-sm text-ink-soft">No videos match your search.</li>
              ) : (
                filteredVideos.map((video) => (
                  <li key={video.id} role="option" aria-selected={value === video.id}>
                    <button
                      type="button"
                      className={cn(
                        "w-full rounded-[calc(var(--radius-input)-2px)] px-3 py-2 text-left text-sm transition-colors hover:bg-cream2",
                        value === video.id && "bg-blue-soft font-medium text-ink"
                      )}
                      onClick={() => handleSelect(video.id)}
                    >
                      {video.title}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}
