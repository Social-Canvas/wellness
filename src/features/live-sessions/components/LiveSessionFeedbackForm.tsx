"use client"

import { useState, useTransition } from "react"

import { Button, Input, Label } from "@/components/ui"
import { submitLiveSessionFeedbackAction } from "@/features/live-sessions/actions/live-sessions.actions"

export function LiveSessionFeedbackForm({
  registrationId,
}: {
  registrationId: string
}) {
  const [pending, startTransition] = useTransition()
  const [rating, setRating] = useState("5")
  const [comment, setComment] = useState("")
  const [interested, setInterested] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [ctaPath, setCtaPath] = useState<string | null>(null)

  return (
    <form
      className="space-y-4 rounded-2xl border border-line bg-surface px-5 py-5"
      onSubmit={(event) => {
        event.preventDefault()
        startTransition(async () => {
          setMessage(null)
          const result = await submitLiveSessionFeedbackAction({
            registrationId,
            rating: Number(rating),
            comment: comment || null,
            interestedInMembership: interested,
          })
          if (!result.success) {
            setMessage(result.error.message)
            return
          }
          setMessage("Thank you for your feedback.")
          setCtaPath(result.data.membershipCtaPath)
        })
      }}
    >
      <h3 className="font-display text-xl text-ink">How was your session?</h3>
      <p className="text-sm text-ink-soft">
        Trial access ends after this session. Elevate memberships include weekly
        live sessions and the shared recordings archive.
      </p>
      <div className="space-y-2">
        <Label htmlFor="trial-rating">Rating</Label>
        <Input
          id="trial-rating"
          type="number"
          min={1}
          max={5}
          value={rating}
          onChange={(event) => setRating(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="trial-comment">Comment</Label>
        <Input
          id="trial-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={interested}
          onChange={(event) => setInterested(event.target.checked)}
        />
        I am interested in Elevate membership
      </label>
      <Button type="submit" disabled={pending}>
        Submit feedback
      </Button>
      {message ? <p className="text-sm text-ink">{message}</p> : null}
      {ctaPath ? (
        <a className="text-sm text-blue underline" href={ctaPath}>
          Explore Elevate memberships
        </a>
      ) : null}
    </form>
  )
}
