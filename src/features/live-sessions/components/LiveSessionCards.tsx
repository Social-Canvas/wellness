"use client"

import Link from "next/link"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui"
import {
  createLiveBreathworkTrialCheckoutAction,
  issueMemberJoinUrlAction,
  issueTrialJoinUrlAction,
} from "@/features/live-sessions/actions/live-sessions.actions"
import type { LiveSessionPublic } from "@/features/live-sessions/types"
import {
  LIVE_BREATHWORK_INCLUDED_LABEL,
  LIVE_BREATHWORK_INCLUDED_NOTE,
  LIVE_BREATHWORK_REGISTERED_LABEL,
  LIVE_BREATHWORK_RESERVE_LABEL,
  LIVE_BREATHWORK_UNAVAILABLE_LABEL,
} from "@/features/checkout/utils/live-breathwork-offer-state"

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

export type TrialLiveSessionCardMode =
  | "reserve"
  | "member_included"
  | "already_registered"
  | "unavailable"

export function TrialLiveSessionCard({
  session,
  mode = "reserve",
  registeredHref,
}: {
  session: LiveSessionPublic
  mode?: TrialLiveSessionCardMode
  registeredHref?: string | null
}) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  if (mode === "member_included") {
    return (
      <article className="rounded-2xl border border-line bg-surface px-5 py-5">
        <h3 className="font-display text-xl text-ink">{session.title}</h3>
        <p className="mt-2 text-sm text-ink-soft">
          This live session is included with your active membership.
        </p>
        <p className="mt-3 text-sm text-ink">
          {session.startsAt
            ? new Date(session.startsAt).toLocaleString()
            : "Schedule TBD"}
        </p>
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            disabled
            aria-disabled="true"
            title={LIVE_BREATHWORK_INCLUDED_NOTE}
            className="cursor-not-allowed opacity-60"
          >
            {LIVE_BREATHWORK_INCLUDED_LABEL}
          </Button>
        </div>
        <p className="mt-3 text-sm text-ink-soft" role="status">
          {LIVE_BREATHWORK_INCLUDED_NOTE}
        </p>
      </article>
    )
  }

  if (mode === "already_registered") {
    const href =
      registeredHref ?? `/dashboard/live-sessions/${session.id}/join?trial=1`
    return (
      <article className="rounded-2xl border border-line bg-surface px-5 py-5">
        <h3 className="font-display text-xl text-ink">{session.title}</h3>
        <p className="mt-2 text-sm text-ink-soft">
          You are already registered for this one-time trial session.
        </p>
        <p className="mt-3 text-sm text-ink">
          {session.startsAt
            ? new Date(session.startsAt).toLocaleString()
            : "Schedule TBD"}
        </p>
        <div className="mt-4">
          <Link
            href={href}
            className="inline-flex items-center justify-center rounded-[var(--radius-button)] border border-transparent bg-primary px-6 py-3 text-[14.5px] font-bold text-primary-foreground"
          >
            {LIVE_BREATHWORK_REGISTERED_LABEL}
          </Link>
        </div>
      </article>
    )
  }

  if (mode === "unavailable") {
    return (
      <article className="rounded-2xl border border-line bg-surface px-5 py-5">
        <h3 className="font-display text-xl text-ink">{session.title}</h3>
        <p className="mt-2 text-sm text-ink-soft">
          Trial registration is not available for this session right now.
        </p>
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            disabled
            aria-disabled="true"
            className="cursor-not-allowed opacity-60"
          >
            {LIVE_BREATHWORK_UNAVAILABLE_LABEL}
          </Button>
        </div>
      </article>
    )
  }

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
          {LIVE_BREATHWORK_RESERVE_LABEL}
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
