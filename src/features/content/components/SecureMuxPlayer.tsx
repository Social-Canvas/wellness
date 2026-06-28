"use client"

import MuxPlayer from "@mux/mux-player-react"
import { AlertCircle, Lock, Loader2 } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

type PlaybackState =
  | { status: "loading" }
  | { status: "ready"; playbackId: string; token: string }
  | { status: "locked"; message: string }
  | { status: "error"; message: string }

interface SecureMuxPlayerProps {
  videoId: string
  title: string
  poster?: string | null
  className?: string
  startTime?: number
  onTimeUpdate?: (payload: { currentTime: number; duration: number }) => void
  onPause?: (payload: { currentTime: number; duration: number }) => void
  onEnded?: (payload: { currentTime: number; duration: number }) => void
}

type PlaybackTokenResponse = {
  success?: boolean
  data?: {
    token: string
    playbackId: string
    expiresIn: string
  }
  error?: {
    code?: string
    message?: string
  }
}

function PlayerPlaceholder({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex aspect-video flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-line bg-gradient-to-br from-blue-soft to-green-soft px-6 text-center",
        className
      )}
    >
      {children}
    </div>
  )
}

export function SecureMuxPlayer({
  videoId,
  title,
  poster,
  className,
  startTime,
  onTimeUpdate,
  onPause,
  onEnded,
}: SecureMuxPlayerProps) {
  const [playback, setPlayback] = useState<PlaybackState>({ status: "loading" })

  useEffect(() => {
    let cancelled = false

    async function fetchPlaybackToken() {
      setPlayback({ status: "loading" })

      try {
        const response = await fetch("/api/mux/playback-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId }),
        })

        const payload = (await response.json()) as PlaybackTokenResponse

        if (cancelled) {
          return
        }

        if (!response.ok) {
          const message = payload.error?.message ?? "Unable to load video."
          const code = payload.error?.code

          if (response.status === 403 || code === "entitlement_required") {
            setPlayback({ status: "locked", message })
            return
          }

          setPlayback({ status: "error", message })
          return
        }

        if (!payload.success || !payload.data?.token || !payload.data?.playbackId) {
          setPlayback({
            status: "error",
            message: "Invalid playback response.",
          })
          return
        }

        setPlayback({
          status: "ready",
          playbackId: payload.data.playbackId,
          token: payload.data.token,
        })
      } catch {
        if (!cancelled) {
          setPlayback({
            status: "error",
            message: "Unable to load video.",
          })
        }
      }
    }

    void fetchPlaybackToken()

    return () => {
      cancelled = true
    }
  }, [videoId])

  function readMediaPayload(event: Event): { currentTime: number; duration: number } {
    const media = event.target as HTMLVideoElement | null

    return {
      currentTime: media?.currentTime ?? 0,
      duration: media?.duration ?? 0,
    }
  }

  if (playback.status === "ready") {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-[var(--radius-card)] border border-line",
          className
        )}
      >
        <MuxPlayer
          playbackId={playback.playbackId}
          tokens={{ playback: playback.token }}
          metadata={{ video_title: title }}
          poster={poster ?? undefined}
          streamType="on-demand"
          startTime={startTime}
          className="aspect-video w-full"
          onTimeUpdate={(event) => onTimeUpdate?.(readMediaPayload(event))}
          onPause={(event) => onPause?.(readMediaPayload(event))}
          onEnded={(event) => onEnded?.(readMediaPayload(event))}
        />
      </div>
    )
  }

  if (playback.status === "loading") {
    return (
      <PlayerPlaceholder className={className}>
        <Loader2 className="size-8 animate-spin text-blue" aria-hidden="true" />
        <p className="text-sm font-medium text-ink-soft">Preparing video...</p>
      </PlayerPlaceholder>
    )
  }

  if (playback.status === "locked") {
    return (
      <PlayerPlaceholder className={className}>
        <Lock className="size-8 text-blue" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-ink">Video locked</p>
          <p className="text-sm text-ink-soft">{playback.message}</p>
        </div>
      </PlayerPlaceholder>
    )
  }

  return (
    <PlayerPlaceholder className={className}>
      <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink">Unable to play video</p>
        <p className="text-sm text-destructive">{playback.message}</p>
      </div>
    </PlayerPlaceholder>
  )
}
