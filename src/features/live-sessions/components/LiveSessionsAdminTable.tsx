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
