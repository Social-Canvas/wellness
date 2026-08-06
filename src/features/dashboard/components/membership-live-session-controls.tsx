"use client"

import Link from "next/link"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui"
import { buttonVariants } from "@/components/ui/button"
import {
  cancelVirtualLiveSessionReservationAction,
  issueMemberJoinUrlAction,
  reserveVirtualLiveSessionAction,
} from "@/features/live-sessions/actions/live-sessions.actions"
import { cn } from "@/lib/utils"

type MembershipLiveSessionControlsProps = {
  liveClassId: string
  joinAvailable: boolean
  scheduleLabel: string
  enforcementActive: boolean
  showAllowance: boolean
  reserved: boolean
  limitReached: boolean
  allowanceCopy: string
  remainingCopy: string | null
  upgradeHref: string | null
}

/**
 * Quota plans (Gold): Reserve → Join during window.
 * Non-quota plans: Join only (legacy boolean entitlement).
 * Zoom URLs are never embedded — issued only after server checks.
 */
export function MembershipLiveSessionControls({
  liveClassId,
  joinAvailable,
  scheduleLabel,
  enforcementActive,
  showAllowance,
  reserved,
  limitReached,
  allowanceCopy,
  remainingCopy,
  upgradeHref,
}: MembershipLiveSessionControlsProps) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [isReserved, setIsReserved] = useState(reserved)
  const [localAllowance, setLocalAllowance] = useState(allowanceCopy)

  return (
    <div className="space-y-3" data-membership-live-controls>
      {showAllowance ? (
        <div className="space-y-1" data-virtual-session-allowance>
          <p className="text-sm font-semibold text-ink">{localAllowance}</p>
          {remainingCopy && enforcementActive && !limitReached ? (
            <p className="text-sm text-ink-soft">{remainingCopy}</p>
          ) : null}
        </div>
      ) : null}

      <p className="text-sm text-ink-soft" data-join-schedule-state>
        {scheduleLabel}
      </p>

      {enforcementActive && limitReached && !isReserved ? (
        <div className="space-y-3" data-virtual-session-limit-reached>
          <p className="text-sm text-ink-soft" role="status">
            You have used both included live virtual sessions for this month.
            Upgrade to Platinum for access to all live virtual classes.
          </p>
          {upgradeHref ? (
            <Link
              href={upgradeHref}
              className={cn(buttonVariants({ variant: "default" }))}
              data-upgrade-to-platinum
            >
              Upgrade to Platinum
            </Link>
          ) : null}
        </div>
      ) : null}

      {enforcementActive && !limitReached && !isReserved ? (
        <Button
          type="button"
          disabled={pending}
          data-membership-reserve-button
          onClick={() =>
            startTransition(async () => {
              setMessage(null)
              const result = await reserveVirtualLiveSessionAction(liveClassId)
              if (!result.success) {
                setMessage(result.error.message)
                return
              }
              setIsReserved(true)
              setLocalAllowance(result.data.allowanceCopy)
            })
          }
        >
          {pending ? "Reserving…" : "Reserve session"}
        </Button>
      ) : null}

      {enforcementActive && isReserved ? (
        <div className="flex flex-wrap gap-3">
          <p
            className="w-full text-sm font-semibold text-green-deep"
            data-reservation-state
          >
            Reserved
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
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            data-membership-cancel-reservation
            onClick={() =>
              startTransition(async () => {
                setMessage(null)
                const result =
                  await cancelVirtualLiveSessionReservationAction(liveClassId)
                if (!result.success) {
                  setMessage(result.error.message)
                  return
                }
                setIsReserved(false)
              })
            }
          >
            Cancel reservation
          </Button>
        </div>
      ) : null}

      {!enforcementActive ? (
        joinAvailable ? (
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
        )
      ) : null}

      {message ? (
        <p className="text-sm text-destructive" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}
