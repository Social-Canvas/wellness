"use client"

import { useState } from "react"

import { Button } from "@/components/ui"

interface DownloadProductButtonProps {
  productId: string
  fileId?: string
  fileName?: string
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

export function DownloadProductButton({
  productId,
  fileId,
  fileName,
}: DownloadProductButtonProps) {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleDownload() {
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/products/download-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, fileId }),
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

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={handleDownload} disabled={isSubmitting}>
        {isSubmitting ? "Preparing..." : `Download${fileName ? ` ${fileName}` : ""}`}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
