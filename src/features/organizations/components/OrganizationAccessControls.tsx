"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  generateOrganizationAccessCodeAction,
  removeOrganizationMemberAction,
  revokeOrganizationAccessCodeAction,
  suspendOrganizationMemberAction,
} from "@/features/organizations/actions/organization-access.actions"

type MemberRow = {
  id: string
  email: string
  role: string
  status: string
}

type OrganizationAccessControlsProps = {
  organizationId: string
  codePrefix: string | null
  codeStatus: string | null
  codeExpiresAt: string | null
  members: MemberRow[]
}

export function OrganizationAccessControls({
  organizationId,
  codePrefix,
  codeStatus,
  codeExpiresAt,
  members,
}: OrganizationAccessControlsProps) {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revealedCode, setRevealedCode] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function run(action: () => Promise<void>) {
    setMessage(null)
    setError(null)
    startTransition(async () => {
      try {
        await action()
      } catch {
        setError("Something went wrong. Please try again.")
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line px-4 py-3 text-sm text-ink-soft">
        <p>
          <span className="font-semibold text-ink">Access code:</span>{" "}
          {codePrefix ? `${codePrefix}-••••` : "Not generated"}
          {codeStatus ? ` · ${codeStatus}` : ""}
          {codeExpiresAt ? ` · expires ${new Date(codeExpiresAt).toLocaleDateString()}` : ""}
        </p>
        <p className="mt-1 text-xs">
          The complete code is shown only once when created or regenerated.
        </p>
      </div>

      {revealedCode ? (
        <div
          role="status"
          className="rounded-xl border border-blue/30 bg-blue/5 px-4 py-3 text-sm text-ink"
        >
          <p className="font-semibold">Save this code securely. It will not be shown again.</p>
          <p className="mt-2 font-mono text-base tracking-wide">{revealedCode}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              void navigator.clipboard?.writeText(revealedCode)
              setMessage("Code copied to clipboard.")
            }}
          >
            Copy code
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={isPending}
          onClick={() =>
            run(async () => {
              const result = await generateOrganizationAccessCodeAction({
                organizationId,
              })
              if (!result.success) {
                setError(result.error.message)
                return
              }
              setRevealedCode(result.data.displayCode)
              setMessage(
                codePrefix
                  ? "Access code regenerated. Previous code is invalid."
                  : "Access code generated."
              )
            })
          }
        >
          {codePrefix ? "Regenerate code" : "Generate code"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending || !codePrefix}
          onClick={() =>
            run(async () => {
              const result = await revokeOrganizationAccessCodeAction({
                organizationId,
              })
              if (!result.success) {
                setError(result.error.message)
                return
              }
              setRevealedCode(null)
              setMessage(
                result.data.revoked
                  ? "Access code revoked."
                  : "No active access code to revoke."
              )
            })
          }
        >
          Revoke code
        </Button>
      </div>

      <ul className="space-y-2">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm"
          >
            <span>
              <span className="font-semibold text-ink">{member.email}</span>
              <span className="ml-2 text-xs text-ink-soft">
                ({member.role} · {member.status})
              </span>
            </span>
            <span className="flex gap-2">
              {member.status === "active" || member.status === "invited" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending || member.role === "owner"}
                  onClick={() =>
                    run(async () => {
                      const result = await suspendOrganizationMemberAction({
                        organizationId,
                        memberId: member.id,
                      })
                      if (!result.success) {
                        setError(result.error.message)
                        return
                      }
                      setMessage("Member suspended.")
                    })
                  }
                >
                  Suspend
                </Button>
              ) : null}
              {member.status !== "removed" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending || member.role === "owner"}
                  onClick={() =>
                    run(async () => {
                      const result = await removeOrganizationMemberAction({
                        organizationId,
                        memberId: member.id,
                      })
                      if (!result.success) {
                        setError(result.error.message)
                        return
                      }
                      setMessage("Member removed. Seat released.")
                    })
                  }
                >
                  Remove
                </Button>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      {message ? (
        <p role="status" className="text-sm text-green-deep">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

type PlatformCreateOrganizationFormProps = {
  onSubmitAction: (formData: FormData) => Promise<{ ok: boolean; message: string }>
}

export function PlatformCreateOrganizationForm({
  onSubmitAction,
}: PlatformCreateOrganizationFormProps) {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <form
      className="space-y-3 rounded-2xl border border-line bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        setMessage(null)
        setError(null)
        startTransition(async () => {
          const result = await onSubmitAction(formData)
          if (result.ok) {
            setMessage(result.message)
            event.currentTarget.reset()
          } else {
            setError(result.message)
          }
        })
      }}
    >
      <h3 className="font-display text-lg font-medium text-ink">
        Create or update organization
      </h3>
      <p className="text-xs text-ink-soft">
        Enquiry submission never activates access. Approval, payment, seat limit,
        and access code generation are explicit admin steps.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="org-name">Organization name</Label>
          <Input id="org-name" name="name" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="org-seats">Approved seat limit</Label>
          <Input
            id="org-seats"
            name="seatLimit"
            type="number"
            min={0}
            defaultValue={25}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="org-status">Status</Label>
          <select
            id="org-status"
            name="status"
            defaultValue="active"
            className="min-h-11 w-full rounded-[var(--radius-input)] border border-line bg-surface px-3 text-sm"
          >
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="active">active</option>
            <option value="suspended">suspended</option>
            <option value="expired">expired</option>
            <option value="cancelled">cancelled</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="org-billing">Billing / contract status</Label>
          <select
            id="org-billing"
            name="billingStatus"
            defaultValue="manual_contract"
            className="min-h-11 w-full rounded-[var(--radius-input)] border border-line bg-surface px-3 text-sm"
          >
            <option value="manual_contract">manual_contract</option>
            <option value="paid">paid</option>
            <option value="invoiced">invoiced</option>
            <option value="stripe_subscription">stripe_subscription</option>
            <option value="unpaid">unpaid</option>
            <option value="past_due">past_due</option>
            <option value="cancelled">cancelled</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="org-admin-email">Assign administrator email</Label>
          <Input id="org-admin-email" name="adminEmail" type="email" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="org-id">Existing organization id (optional)</Label>
          <Input id="org-id" name="organizationId" placeholder="uuid" />
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save organization"}
      </Button>
      {message ? <p className="text-sm text-green-deep">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </form>
  )
}
