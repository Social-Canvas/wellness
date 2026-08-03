"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui"
import {
  archiveRecordedSessionAction,
  createRecordedSessionAction,
  publishRecordedSessionAction,
  unpublishRecordedSessionAction,
  updateRecordedSessionAction,
} from "@/features/recorded-sessions/actions/recorded-sessions.actions"
import { RECORDED_SESSION_FOCUS_VALUES } from "@/features/recorded-sessions/schemas"
import type { RecordedSession } from "@/features/recorded-sessions/types"
import { slugifyRecordedSessionTitle } from "@/features/recorded-sessions/utils/recorded-sessions"
import { formatDuration } from "@/features/content/utils/format-duration"

interface RecordedSessionsAdminTableProps {
  sessions: RecordedSession[]
}

type DraftForm = {
  title: string
  slug: string
  shortDescription: string
  presenter: string
  monthlyTheme: string
  weekNumber: string
  weeklyTopic: string
  focus: string
  recordedAt: string
  muxAssetId: string
  muxPlaybackId: string
  processingStatus: string
  durationSeconds: string
  thumbnailUrl: string
}

const emptyForm = (): DraftForm => ({
  title: "",
  slug: "",
  shortDescription: "",
  presenter: "",
  monthlyTheme: "",
  weekNumber: "",
  weeklyTopic: "",
  focus: "",
  recordedAt: "",
  muxAssetId: "",
  muxPlaybackId: "",
  processingStatus: "draft",
  durationSeconds: "",
  thumbnailUrl: "",
})

function formFromSession(session: RecordedSession): DraftForm {
  return {
    title: session.title,
    slug: session.slug,
    shortDescription: session.short_description ?? "",
    presenter: session.presenter ?? "",
    monthlyTheme: session.monthly_theme ?? "",
    weekNumber: session.week_number ? String(session.week_number) : "",
    weeklyTopic: session.weekly_topic ?? "",
    focus: session.focus ?? "",
    recordedAt: session.recorded_at ?? "",
    muxAssetId: session.mux_asset_id ?? "",
    muxPlaybackId: session.mux_playback_id ?? "",
    processingStatus: session.processing_status,
    durationSeconds:
      session.duration_seconds !== null ? String(session.duration_seconds) : "",
    thumbnailUrl: session.thumbnail_url ?? "",
  }
}

export function RecordedSessionsAdminTable({
  sessions,
}: RecordedSessionsAdminTableProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | "new" | null>(null)
  const [form, setForm] = useState<DraftForm>(emptyForm())

  function openCreate() {
    setEditingId("new")
    setForm(emptyForm())
    setError(null)
  }

  function openEdit(session: RecordedSession) {
    setEditingId(session.id)
    setForm(formFromSession(session))
    setError(null)
  }

  function updateField<K extends keyof DraftForm>(key: K, value: DraftForm[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (key === "title" && editingId === "new" && !current.slug) {
        next.slug = slugifyRecordedSessionTitle(String(value))
      }
      return next
    })
  }

  function submit() {
    setError(null)
    startTransition(async () => {
      const payload = {
        title: form.title,
        slug: form.slug || slugifyRecordedSessionTitle(form.title),
        shortDescription: form.shortDescription || null,
        presenter: form.presenter || null,
        monthlyTheme: form.monthlyTheme || null,
        weekNumber: form.weekNumber ? Number(form.weekNumber) : null,
        weeklyTopic: form.weeklyTopic || null,
        focus: (form.focus || null) as
          | "awareness"
          | "release"
          | "embodiment"
          | "integration"
          | null,
        recordedAt: form.recordedAt || null,
        muxAssetId: form.muxAssetId || null,
        muxPlaybackId: form.muxPlaybackId || null,
        processingStatus: form.processingStatus as RecordedSession["processing_status"],
        durationSeconds: form.durationSeconds ? Number(form.durationSeconds) : null,
        thumbnailUrl: form.thumbnailUrl || null,
        publicationStatus: "draft" as const,
      }

      const result =
        editingId === "new"
          ? await createRecordedSessionAction(payload)
          : editingId
            ? await updateRecordedSessionAction(editingId, payload)
            : null

      if (!result) return
      if (!result.success) {
        setError(result.error.message)
        return
      }

      setEditingId(null)
      setForm(emptyForm())
      router.refresh()
    })
  }

  function runStatusAction(
    action: (id: string) => Promise<{ success: boolean; error?: { message: string } }>,
    id: string
  ) {
    setError(null)
    startTransition(async () => {
      const result = await action(id)
      if (!result.success) {
        setError(result.error?.message ?? "Action failed.")
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          Metadata CRUD + link existing Mux assets. Browser upload enhancement can follow;
          do not auto-delete prior Mux assets when replacing IDs.
        </p>
        <Button type="button" onClick={openCreate} disabled={pending}>
          New session
        </Button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {editingId ? (
        <Card>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="rs-title">Title</Label>
              <Input
                id="rs-title"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs-slug">Slug</Label>
              <Input
                id="rs-slug"
                value={form.slug}
                onChange={(e) => updateField("slug", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs-recorded">Recorded date</Label>
              <Input
                id="rs-recorded"
                type="date"
                value={form.recordedAt}
                onChange={(e) => updateField("recordedAt", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="rs-desc">Short description</Label>
              <Input
                id="rs-desc"
                value={form.shortDescription}
                onChange={(e) => updateField("shortDescription", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs-presenter">Presenter</Label>
              <Input
                id="rs-presenter"
                value={form.presenter}
                onChange={(e) => updateField("presenter", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs-theme">Monthly theme</Label>
              <Input
                id="rs-theme"
                value={form.monthlyTheme}
                onChange={(e) => updateField("monthlyTheme", e.target.value)}
                placeholder="Leave blank until confirmed"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs-week">Week number</Label>
              <Input
                id="rs-week"
                value={form.weekNumber}
                onChange={(e) => updateField("weekNumber", e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs-topic">Weekly topic</Label>
              <Input
                id="rs-topic"
                value={form.weeklyTopic}
                onChange={(e) => updateField("weeklyTopic", e.target.value)}
                placeholder="Leave blank until confirmed"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs-focus">Focus</Label>
              <select
                id="rs-focus"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.focus}
                onChange={(e) => updateField("focus", e.target.value)}
              >
                <option value="">Uncategorized</option>
                {RECORDED_SESSION_FOCUS_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs-duration">Duration (seconds)</Label>
              <Input
                id="rs-duration"
                value={form.durationSeconds}
                onChange={(e) => updateField("durationSeconds", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs-mux-asset">Mux asset ID</Label>
              <Input
                id="rs-mux-asset"
                value={form.muxAssetId}
                onChange={(e) => updateField("muxAssetId", e.target.value)}
                placeholder="Link existing asset only"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs-mux-playback">Mux playback ID (signed)</Label>
              <Input
                id="rs-mux-playback"
                value={form.muxPlaybackId}
                onChange={(e) => updateField("muxPlaybackId", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs-processing">Processing status</Label>
              <select
                id="rs-processing"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.processingStatus}
                onChange={(e) => updateField("processingStatus", e.target.value)}
              >
                {[
                  "draft",
                  "uploading",
                  "processing",
                  "ready",
                  "failed",
                  "published",
                  "archived",
                ].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rs-thumb">Thumbnail URL</Label>
              <Input
                id="rs-thumb"
                value={form.thumbnailUrl}
                onChange={(e) => updateField("thumbnailUrl", e.target.value)}
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="button" onClick={submit} disabled={pending}>
                {editingId === "new" ? "Create draft" : "Save changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingId(null)}
                disabled={pending}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-cream2/50 px-6 py-10 text-center">
          <p className="font-display text-lg font-medium text-ink">No recorded sessions yet</p>
          <p className="mt-2 text-sm text-ink-soft">
            Create draft metadata, then link existing Mux assets (no re-upload).
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mux</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-ink">{session.title}</p>
                        <p className="text-xs text-ink-soft">{session.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <p>pub: {session.publication_status}</p>
                        <p>mux: {session.processing_status}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate text-xs text-ink-soft">
                      {session.mux_asset_id ?? "—"}
                    </TableCell>
                    <TableCell>{formatDuration(session.duration_seconds)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(session)}
                          disabled={pending}
                        >
                          Edit
                        </Button>
                        {session.publication_status === "published" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              runStatusAction(unpublishRecordedSessionAction, session.id)
                            }
                            disabled={pending}
                          >
                            Unpublish
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              runStatusAction(publishRecordedSessionAction, session.id)
                            }
                            disabled={pending}
                          >
                            Publish
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            runStatusAction(archiveRecordedSessionAction, session.id)
                          }
                          disabled={pending || session.publication_status === "archived"}
                        >
                          Archive
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
