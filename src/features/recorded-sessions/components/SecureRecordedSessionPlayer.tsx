"use client"

import MuxPlayer from "@mux/mux-player-react"
import { AlertCircle, Lock, Loader2 } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"

import { resolvePosterUrl } from "@/features/content/utils/poster-url"
import { cn } from "@/lib/utils"

type PlaybackState =
  | { status: "loading" }
  | { status: "ready"; playbackId: string; token: string }
  | { status: "locked"; message: string }
  | { status: "error"; message: string }

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

interface SecureRecordedSessionPlayerProps {
  sessionId: string
  title: string
  poster?: string | null
  className?: string
}

function PlayerPlaceholder({
  children,
  className,
  label,
}: {
  children: ReactNode
  className?: string
  label: string
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        "relative flex aspect-video w-full max-w-4xl flex-col items-center justify-center gap-3 overflow-hidden rounded-[var(--radius-card)] border border-line bg-gradient-to-br from-blue-soft to-green-soft px-6 text-center",
        className
      )}
    >
      {children}
    </div>
  )
}

export function SecureRecordedSessionPlayer({
  sessionId,
  title,
  poster,
  className,
}: SecureRecordedSessionPlayerProps) {
  const [playback, setPlayback] = useState<PlaybackState>({ status: "loading" })
  const safePoster = resolvePosterUrl(poster)

  useEffect(() => {
    let cancelled = false

    async function fetchPlaybackToken() {
      setPlayback({ status: "loading" })

      try {
        const response = await fetch("/api/mux/playback-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordedSessionId: sessionId }),
        })

        const payload = (await response.json()) as PlaybackTokenResponse

        if (cancelled) return

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
  }, [sessionId])

  if (playback.status === "ready") {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-[var(--radius-card)] border border-line bg-ink",
          className
        )}
      >
        <MuxPlayer
          playbackId={playback.playbackId}
          tokens={{ playback: playback.token }}
          streamType="on-demand"
          accentColor="#2F7E96"
          poster={safePoster ?? undefined}
          metadata={{ video_title: title }}
          className="aspect-video w-full"
        />
      </div>
    )
  }

  if (playback.status === "locked") {
    return (
      <PlayerPlaceholder className={className} label="Playback locked">
        <Lock className="size-8 text-ink-soft" aria-hidden="true" />
        <p className="max-w-sm text-sm text-ink-soft">{playback.message}</p>
      </PlayerPlaceholder>
    )
  }

  if (playback.status === "error") {
    return (
      <PlayerPlaceholder className={className} label="Playback error">
        <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
        <p className="max-w-sm text-sm text-destructive">{playback.message}</p>
      </PlayerPlaceholder>
    )
  }

  return (
    <PlayerPlaceholder className={className} label="Loading playback">
      <Loader2 className="size-8 animate-spin text-blue" aria-hidden="true" />
      <p className="text-sm text-ink-soft">Preparing secure playback…</p>
    </PlayerPlaceholder>
  )
}
