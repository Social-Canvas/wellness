"use client"

import { useState } from "react"

import { Button } from "@/components/ui"

interface DownloadCourseResourceButtonProps {
  courseId: string
  resourceId: string
  fileName?: string
  label?: string
}

type DownloadResponse = {
  success?: boolean
  data?: {
    url: string
    fileName: string
  }
  error?: {
    message?: string
  }
}

export function DownloadCourseResourceButton({
  courseId,
  resourceId,
  fileName,
  label,
}: DownloadCourseResourceButtonProps) {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleDownload() {
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/course-resources/download-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        cache: "no-store",
        body: JSON.stringify({ courseId, resourceId }),
      })

      const payload = (await response.json()) as DownloadResponse

      if (!response.ok || !payload.success || !payload.data?.url) {
        setError(payload.error?.message ?? "Unable to generate download link.")
        return
      }

      window.location.href = payload.data.url
    } catch {
      setError("Unable to generate download link.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const buttonLabel = label ?? (fileName ? `Download ${fileName}` : "Download")

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        onClick={handleDownload}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Preparing..." : buttonLabel}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
