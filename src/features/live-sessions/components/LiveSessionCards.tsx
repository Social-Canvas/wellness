"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui"
import {
  createLiveBreathworkTrialCheckoutAction,
  issueMemberJoinUrlAction,
  issueTrialJoinUrlAction,
} from "@/features/live-sessions/actions/live-sessions.actions"
import type { LiveSessionPublic } from "@/features/live-sessions/types"

export function MemberLiveSessionCard({
  session,
}: {
  session: LiveSessionPublic
}) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  return (
    <article className="rounded-2xl border border-line bg-surface px-5 py-5">
      <h3 className="font-display text-xl text-ink">{session.title}</h3>
      {session.description ? (
        <p className="mt-2 text-sm text-ink-soft">{session.description}</p>
      ) : null}
      <p className="mt-3 text-sm text-ink">
        {session.startsAt
          ? new Date(session.startsAt).toLocaleString()
          : "Schedule TBD"}
      </p>
      <div className="mt-4">
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setMessage(null)
              const result = await issueMemberJoinUrlAction(session.id)
              if (!result.success) {
                setMessage(result.error.message)
                return
              }
              window.location.assign(result.data.joinUrl)
            })
          }
        >
          Join session
        </Button>
      </div>
      {message ? <p className="mt-3 text-sm text-destructive">{message}</p> : null}
    </article>
  )
}

export function TrialLiveSessionCard({
  session,
}: {
  session: LiveSessionPublic
}) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  return (
    <article className="rounded-2xl border border-line bg-surface px-5 py-5">
      <h3 className="font-display text-xl text-ink">{session.title}</h3>
      <p className="mt-2 text-sm text-ink-soft">
        One-time Live Breathwork trial for this selected upcoming session only.
        No membership, recordings, or future sessions are included.
      </p>
      <p className="mt-3 text-sm text-ink">
        {session.startsAt
          ? new Date(session.startsAt).toLocaleString()
          : "Schedule TBD"}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setMessage(null)
              const result = await createLiveBreathworkTrialCheckoutAction({
                liveClassId: session.id,
              })
              if (!result.success) {
                setMessage(result.error.message)
                return
              }
              window.location.assign(result.data.url)
            })
          }
        >
          Reserve trial spot
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setMessage(null)
              const result = await issueTrialJoinUrlAction(session.id)
              if (!result.success) {
                setMessage(result.error.message)
                return
              }
              window.location.assign(result.data.joinUrl)
            })
          }
        >
          Join if already registered
        </Button>
      </div>
      {message ? <p className="mt-3 text-sm text-destructive">{message}</p> : null}
    </article>
  )
}
