"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui"
import { issueMemberJoinUrlAction } from "@/features/live-sessions/actions/live-sessions.actions"

type MembershipJoinButtonProps = {
  liveClassId: string
  joinAvailable: boolean
  scheduleLabel: string
}

/**
 * Join never embeds a Zoom URL in HTML. The participant link is issued only
 * after server-side auth, entitlement, publish, and join-window checks.
 */
export function MembershipJoinButton({
  liveClassId,
  joinAvailable,
  scheduleLabel,
}: MembershipJoinButtonProps) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-soft" data-join-schedule-state>
        {scheduleLabel}
      </p>
      {joinAvailable ? (
        <Button
          type="button"
          disabled={pending}
          data-membership-join-button
          onClick={() =>
            startTransition(async () => {
              setMessage(null)
              const result = await issueMemberJoinUrlAction(liveClassId)
              if (!result.success) {
                setMessage(result.error.message)
                return
              }
              window.location.assign(result.data.joinUrl)
            })
          }
        >
          {pending ? "Opening…" : "Join session"}
        </Button>
      ) : (
        <Button type="button" disabled aria-disabled="true" variant="outline">
          Join opens soon
        </Button>
      )}
      {message ? (
        <p className="text-sm text-destructive" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}
