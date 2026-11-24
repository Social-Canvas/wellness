"use client"

import { useState } from "react"

import {
  grantComplimentaryResetAction,
  revokeComplimentaryResetAction,
} from "@/features/members/actions/complimentary-reset.actions"

export function ComplimentaryResetForm() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function run(action: "grant" | "revoke") {
    setPending(true)
    setMessage(null)
    const result =
      action === "grant"
        ? await grantComplimentaryResetAction(email)
        : await revokeComplimentaryResetAction(email)
    setPending(false)
    if (!result.success) {
      setMessage(result.error.message)
      return
    }
    setMessage(
      action === "grant" && "status" in result.data
        ? result.data.status === "already_granted"
          ? "This member already has complimentary Reset access."
          : "Complimentary Reset access granted. No paid order was created."
        : "Complimentary Reset entitlement removed. Paid purchases were left in place."
    )
  }

  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <h2 className="font-display text-xl text-ink">Complimentary Reset access</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Grants the 7-Day Reset without a Stripe charge. This is excluded from paid
        revenue.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="member@example.com"
          className="h-10 flex-1 rounded-[var(--radius-input)] border border-line px-3 text-sm"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => run("grant")}
          className="rounded-[var(--radius-button)] bg-blue px-3 py-2 text-sm font-semibold text-white"
        >
          Grant
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run("revoke")}
          className="rounded-[var(--radius-button)] border border-line px-3 py-2 text-sm font-semibold"
        >
          Revoke complimentary
        </button>
      </div>
      {message ? <p className="mt-2 text-sm text-ink-soft">{message}</p> : null}
    </section>
  )
}
