"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { Button, Input, Label } from "@/components/ui"
import { MediaUploader } from "@/features/media/components/media-uploader"
import { saveSiteContentAction } from "@/features/site-content/actions/site-content.actions"
import { SITE_CONTENT_GROUPS } from "@/features/site-content/registry"

export type EditableSiteField = {
  key: string
  group: string
  label: string
  help?: string
  type: "text" | "textarea" | "lines" | "url" | "image"
  value: string
  altText: string
}

const textareaClassName =
  "min-h-28 w-full rounded-[var(--radius-input)] border border-line bg-surface px-3 py-2 text-sm text-ink"

export function SiteContentEditor({ fields }: { fields: EditableSiteField[] }) {
  const router = useRouter()
  const [draft, setDraft] = useState(fields)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)

  const grouped = useMemo(
    () =>
      SITE_CONTENT_GROUPS.map((group) => ({
        ...group,
        fields: draft.filter((field) => field.group === group.key),
      })),
    [draft]
  )

  function update(key: string, patch: Partial<EditableSiteField>) {
    setSaved(false)
    setDraft((current) =>
      current.map((field) => (field.key === key ? { ...field, ...patch } : field))
    )
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const result = await saveSiteContentAction({
      fields: draft.map((field) => ({
        key: field.key,
        value: field.value,
        altText: field.altText,
      })),
    })
    setPending(false)
    if (!result.success) {
      setError(result.error.message)
      return
    }
    setSaved(true)
    router.refresh()
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-ink-soft">
          These forms change public wording and images. They do not change prices,
          Stripe, membership access, or video hosting.
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save content"}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved ? <p className="text-sm text-green-deep">Saved. Public pages will refresh.</p> : null}

      {grouped.map((group) => (
        <details key={group.key} open={group.key === "homepage"} className="rounded-2xl border border-line bg-surface">
          <summary className="cursor-pointer px-5 py-4 font-display text-lg text-ink">
            {group.label}
          </summary>
          <div className="space-y-5 border-t border-line px-5 py-5">
            {group.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                {field.type === "image" ? (
                  <MediaUploader
                    label={field.label}
                    value={field.value}
                    alt={field.altText}
                    folder={field.group}
                    disabled={pending}
                    onChange={(next) => update(field.key, { value: next.url, altText: next.alt })}
                  />
                ) : (
                  <>
                    <Label htmlFor={field.key}>{field.label}</Label>
                    {field.type === "textarea" || field.type === "lines" ? (
                      <textarea
                        id={field.key}
                        className={textareaClassName}
                        value={field.value}
                        disabled={pending}
                        onChange={(event) => update(field.key, { value: event.target.value })}
                      />
                    ) : (
                      <Input
                        id={field.key}
                        value={field.value}
                        disabled={pending}
                        onChange={(event) => update(field.key, { value: event.target.value })}
                      />
                    )}
                  </>
                )}
                {field.help ? <p className="text-xs text-ink-soft">{field.help}</p> : null}
              </div>
            ))}
          </div>
        </details>
      ))}
    </form>
  )
}
