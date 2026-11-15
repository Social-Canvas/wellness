"use client"

import { useState } from "react"

import { Button, Input, Label } from "@/components/ui"
import {
  listSiteMediaAction,
  uploadSiteMediaAction,
} from "@/features/media/actions/media.actions"
import type { SiteMediaAsset } from "@/features/media/types"

type MediaUploaderProps = {
  label: string
  value: string
  alt: string
  onChange: (next: { url: string; alt: string }) => void
  showAlt?: boolean
  disabled?: boolean
  folder?: string
}

export function MediaUploader({
  label,
  value,
  alt,
  onChange,
  showAlt = true,
  disabled = false,
  folder = "content",
}: MediaUploaderProps) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [library, setLibrary] = useState<SiteMediaAsset[] | null>(null)

  async function onFile(file: File | undefined) {
    if (!file) {
      return
    }
    setPending(true)
    setError(null)
    const data = new FormData()
    data.set("file", file)
    data.set("altText", alt)
    data.set("folder", folder)
    const result = await uploadSiteMediaAction(data)
    setPending(false)
    if (!result.success) {
      setError(result.error.message)
      return
    }
    onChange({ url: result.data.publicUrl, alt: result.data.altText || alt })
  }

  async function loadLibrary() {
    setError(null)
    const result = await listSiteMediaAction()
    if (!result.success) {
      setError(result.error.message)
      return
    }
    setLibrary(result.data)
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {value ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={alt || ""}
            className="h-36 w-full rounded-xl border border-line object-cover"
          />
        </>
      ) : (
        <p className="text-sm text-ink-soft">No image selected.</p>
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={disabled || pending}
        aria-label={`Upload ${label}`}
        onChange={(event) => {
          const file = event.target.files?.[0]
          void onFile(file)
          event.target.value = ""
        }}
        className="block w-full text-sm text-ink"
      />
      {showAlt ? (
        <Input
          value={alt}
          disabled={disabled || pending}
          aria-label={`${label} alt text`}
          placeholder="Describe the image"
          onChange={(event) => onChange({ url: value, alt: event.target.value })}
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || pending}
          onClick={() => void loadLibrary()}
        >
          Choose existing
        </Button>
        {value ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || pending}
            onClick={() => onChange({ url: "", alt })}
          >
            Remove image
          </Button>
        ) : null}
      </div>
      {library ? (
        <div className="grid grid-cols-3 gap-2">
          {library.length === 0 ? (
            <p className="col-span-3 text-sm text-ink-soft">No uploaded images yet.</p>
          ) : (
            library.map((asset) => (
              <button
                key={asset.id}
                type="button"
                className="overflow-hidden rounded-lg border border-line"
                onClick={() => onChange({ url: asset.publicUrl, alt: asset.altText || alt })}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset.publicUrl} alt={asset.altText || ""} className="h-20 w-full object-cover" />
              </button>
            ))
          )}
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {pending ? <p className="text-sm text-ink-soft">Uploading...</p> : null}
    </div>
  )
}
