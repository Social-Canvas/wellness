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
  completeLiveSessionAction,
  createLiveSessionAction,
  updateLiveSessionAction,
} from "@/features/live-sessions/actions/live-sessions.actions"
import type { LiveSessionAdmin } from "@/features/live-sessions/types"

interface LiveSessionsAdminTableProps {
  sessions: LiveSessionAdmin[]
}

export function LiveSessionsAdminTable({ sessions }: LiveSessionsAdminTableProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [participantUrl, setParticipantUrl] = useState("")
  const [hostUrl, setHostUrl] = useState("")
  const [trialOpen, setTrialOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editStarts, setEditStarts] = useState("")
  const [editParticipant, setEditParticipant] = useState("")
  const [editHost, setEditHost] = useState("")
  const [editTrial, setEditTrial] = useState(false)

  function refresh() {
    router.refresh()
  }

  function onCreate() {
    setError(null)
    startTransition(async () => {
      const startsIso = startsAt ? new Date(startsAt).toISOString() : ""
      const result = await createLiveSessionAction({
        title,
        startsAt: startsIso,
        allowsPublicTrial: trialOpen,
        trialOpen,
        sessionKind: trialOpen ? "public_trial" : "membership_weekly",
        accessType: "member_only",
        status: "draft",
        zoomParticipantUrl: participantUrl || null,
        zoomHostUrl: hostUrl || null,
      })
      if (!result.success) {
        setError(result.error.message)
        return
      }
      setTitle("")
      setStartsAt("")
      setParticipantUrl("")
      setHostUrl("")
      setTrialOpen(false)
      refresh()
    })
  }

  function beginEdit(session: LiveSessionAdmin) {
    setEditingId(session.id)
    setEditTitle(session.title)
    setEditDescription(session.description ?? "")
    setEditStarts(toDatetimeLocalValue(session.startsAt))
    setEditParticipant("")
    setEditHost("")
    setEditTrial(Boolean(session.trialOpen || session.allowsPublicTrial))
    setError(null)
  }

  function onSaveEdit() {
    if (!editingId) return
    setError(null)
    startTransition(async () => {
      const result = await updateLiveSessionAction(editingId, {
        title: editTitle,
        description: editDescription,
        startsAt: new Date(editStarts).toISOString(),
        allowsPublicTrial: editTrial,
        trialOpen: editTrial,
        sessionKind: editTrial ? "public_trial" : "membership_weekly",
        ...(editParticipant ? { zoomParticipantUrl: editParticipant } : {}),
        ...(editHost ? { zoomHostUrl: editHost } : {}),
      })
      if (!result.success) {
        setError(result.error.message)
        return
      }
      setEditingId(null)
      refresh()
    })
  }

  const editing = sessions.find((session) => session.id === editingId) ?? null

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h3 className="font-display text-lg text-ink">Schedule a live session</h3>
          <p className="text-sm text-ink-soft">
            Zoom participant and host URLs are stored server-side only and never
            rendered in public HTML.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="live-title">Title</Label>
              <Input
                id="live-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="live-starts">Starts at</Label>
              <Input
                id="live-starts"
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="live-participant">Zoom participant URL</Label>
              <Input
                id="live-participant"
                type="url"
                value={participantUrl}
                onChange={(event) => setParticipantUrl(event.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="live-host">Zoom host URL</Label>
              <Input
                id="live-host"
                type="url"
                value={hostUrl}
                onChange={(event) => setHostUrl(event.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={trialOpen}
              onChange={(event) => setTrialOpen(event.target.checked)}
            />
            Open this upcoming session for Live Breathwork public trial
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="button" disabled={pending || !title || !startsAt} onClick={onCreate}>
            Create draft session
          </Button>
        </CardContent>
      </Card>

      {editing ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <h3 className="font-display text-lg text-ink">Edit {editing.title}</h3>
            <p className="text-sm text-ink-soft">
              Leave Zoom fields blank to keep the URLs already stored. They are
              not shown again after saving.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-live-title">Title</Label>
                <Input
                  id="edit-live-title"
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-live-description">Details</Label>
                <textarea
                  id="edit-live-description"
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  className="min-h-24 w-full rounded-[var(--radius-input)] border border-input bg-transparent px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-live-starts">Date and time</Label>
                <Input
                  id="edit-live-starts"
                  type="datetime-local"
                  value={editStarts}
                  onChange={(event) => setEditStarts(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-live-participant">Zoom participant URL</Label>
                <Input
                  id="edit-live-participant"
                  type="url"
                  value={editParticipant}
                  onChange={(event) => setEditParticipant(event.target.value)}
                  autoComplete="off"
                  placeholder={editing.hasParticipantUrl ? "Already set" : "Add participant URL"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-live-host">Zoom host URL</Label>
                <Input
                  id="edit-live-host"
                  type="url"
                  value={editHost}
                  onChange={(event) => setEditHost(event.target.value)}
                  autoComplete="off"
                  placeholder={editing.hasHostUrl ? "Already set" : "Add host URL"}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={editTrial}
                onChange={(event) => setEditTrial(event.target.checked)}
              />
              Open this upcoming session for Live Breathwork public trial
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={pending || !editTitle || !editStarts}
                onClick={onSaveEdit}
              >
                Save session
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setEditingId(null)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Starts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trial</TableHead>
                <TableHead>Zoom</TableHead>
                <TableHead>Regs</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>{session.title}</TableCell>
                  <TableCell>
                    {session.startsAt
                      ? new Date(session.startsAt).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell>{session.status}</TableCell>
                  <TableCell>
                    {session.trialOpen ? "Open" : session.allowsPublicTrial ? "Allowed" : "—"}
                  </TableCell>
                  <TableCell>
                    {session.hasParticipantUrl ? "Participant set" : "Missing"}
                    {session.hasHostUrl ? " · Host set" : ""}
                  </TableCell>
                  <TableCell>
                    {session.registrationCount}
                    {session.trialRegistrationCount
                      ? ` (${session.trialRegistrationCount} trial)`
                      : ""}
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => beginEdit(session)}
                    >
                      Edit
                    </Button>
                    {session.status === "published" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await updateLiveSessionAction(session.id, {
                              status: "draft",
                            })
                            if (!result.success) {
                              setError(result.error.message)
                              return
                            }
                            refresh()
                          })
                        }
                      >
                        Unpublish
                      </Button>
                    ) : null}
                    {session.status !== "published" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await updateLiveSessionAction(session.id, {
                              status: "published",
                            })
                            refresh()
                          })
                        }
                      >
                        Publish
                      </Button>
                    ) : null}
                    {!session.completedAt ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            await completeLiveSessionAction(session.id)
                            refresh()
                          })
                        }
                      >
                        Mark complete
                      </Button>
                    ) : (
                      <span className="text-xs text-ink-soft">Completed</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
