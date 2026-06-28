"use client"

import { useCallback, useEffect, useRef } from "react"

import { SecureMuxPlayer } from "@/features/content/components/SecureMuxPlayer"
import {
  markVideoCompleteAction,
  saveVideoProgressAction,
} from "@/features/progress/actions/progress.actions"

const PROGRESS_SAVE_INTERVAL_MS = 17_000

interface ProgressTrackedMuxPlayerProps {
  videoId: string
  lessonId: string
  title: string
  poster?: string | null
  startTimeSeconds?: number
  isCompleted?: boolean
  className?: string
}

export function ProgressTrackedMuxPlayer({
  videoId,
  lessonId,
  title,
  poster,
  startTimeSeconds = 0,
  isCompleted = false,
  className,
}: ProgressTrackedMuxPlayerProps) {
  const lastSavedAtRef = useRef(0)
  const latestProgressRef = useRef({
    positionSeconds: 0,
    durationSeconds: 0,
  })
  const isSavingRef = useRef(false)

  const persistProgress = useCallback(
    async (positionSeconds: number, durationSeconds: number) => {
      if (isSavingRef.current) {
        return
      }

      isSavingRef.current = true

      try {
        await saveVideoProgressAction({
          videoId,
          lessonId,
          positionSeconds: Math.max(0, Math.floor(positionSeconds)),
          durationSeconds: Math.max(0, Math.floor(durationSeconds)),
        })
      } finally {
        isSavingRef.current = false
      }
    },
    [lessonId, videoId]
  )

  const maybePersistProgress = useCallback(
    (positionSeconds: number, durationSeconds: number, force = false) => {
      latestProgressRef.current = {
        positionSeconds: Math.max(0, Math.floor(positionSeconds)),
        durationSeconds: Math.max(0, Math.floor(durationSeconds)),
      }

      const now = Date.now()

      if (!force && now - lastSavedAtRef.current < PROGRESS_SAVE_INTERVAL_MS) {
        return
      }

      lastSavedAtRef.current = now
      void persistProgress(positionSeconds, durationSeconds)
    },
    [persistProgress]
  )

  useEffect(() => {
    function handlePageHide() {
      const { positionSeconds, durationSeconds } = latestProgressRef.current

      if (durationSeconds <= 0) {
        return
      }

      void persistProgress(positionSeconds, durationSeconds)
    }

    window.addEventListener("pagehide", handlePageHide)

    return () => {
      window.removeEventListener("pagehide", handlePageHide)
    }
  }, [persistProgress])

  const resumeTime =
    !isCompleted && startTimeSeconds > 0 ? startTimeSeconds : undefined

  return (
    <SecureMuxPlayer
      videoId={videoId}
      title={title}
      poster={poster}
      className={className}
      startTime={resumeTime}
      onTimeUpdate={({ currentTime, duration }) => {
        maybePersistProgress(currentTime, duration)
      }}
      onPause={({ currentTime, duration }) => {
        maybePersistProgress(currentTime, duration, true)
      }}
      onEnded={({ currentTime, duration }) => {
        maybePersistProgress(currentTime, duration, true)
        void markVideoCompleteAction({ videoId, lessonId })
      }}
    />
  )
}
