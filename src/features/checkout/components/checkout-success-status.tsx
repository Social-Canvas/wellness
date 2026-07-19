"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { pollCheckoutFulfillmentAction } from "@/features/checkout/actions/checkout-success.actions"
import { cn } from "@/lib/utils"

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 30000

type CheckoutSuccessStatusProps = {
  sessionId: string
  initialState: "fulfilled" | "processing" | "invalid"
  initialMessage: string
  productName: string
  destinationHref: string | null
  destinationLabel: string | null
  autoRedirect: boolean
}

export function CheckoutSuccessStatus({
  sessionId,
  initialState,
  initialMessage,
  productName,
  destinationHref,
  destinationLabel,
  autoRedirect,
}: CheckoutSuccessStatusProps) {
  const router = useRouter()
  const [state, setState] = useState(initialState)
  const [message, setMessage] = useState(initialMessage)
  const [href, setHref] = useState(destinationHref)
  const [label, setLabel] = useState(destinationLabel)
  const [timedOut, setTimedOut] = useState(false)
  const [isPending, startTransition] = useTransition()
  const startedAt = useRef(0)
  const redirected = useRef(false)

  useEffect(() => {
    startedAt.current = Date.now()
  }, [])

  useEffect(() => {
    if (state === "fulfilled" && autoRedirect && href && !redirected.current) {
      redirected.current = true
      const timer = window.setTimeout(() => {
        router.push(href)
      }, 1200)
      return () => window.clearTimeout(timer)
    }
  }, [state, autoRedirect, href, router])

  useEffect(() => {
    if (state !== "processing") {
      return
    }

    const interval = window.setInterval(() => {
      if (Date.now() - startedAt.current >= POLL_TIMEOUT_MS) {
        window.clearInterval(interval)
        setTimedOut(true)
        setMessage(
          "Your payment was received. Access is still being activated."
        )
        return
      }

      startTransition(async () => {
        const result = await pollCheckoutFulfillmentAction(sessionId)

        if (!result.success) {
          return
        }

        if (result.data.state === "fulfilled") {
          setState("fulfilled")
          setMessage("Payment successful — your access is ready.")
          setHref(result.data.destinationHref)
          if (result.data.destinationHref) {
            setLabel(label ?? "Continue")
          }
        } else if (result.data.state === "invalid") {
          setState("invalid")
          setMessage(
            "We could not verify this checkout session. If you completed a payment, check My Library or your account."
          )
        }
      })
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [state, sessionId, label])

  function handleRetry() {
    setTimedOut(false)
    startedAt.current = Date.now()
    setState("processing")
    setMessage("Payment successful. We’re activating your access…")
  }

  if (state === "invalid") {
    return (
      <div className="text-center">
        <div
          aria-hidden
          className="mx-auto flex size-16 items-center justify-center rounded-full bg-cream text-3xl text-ink-soft"
        >
          !
        </div>
        <h1 className="mt-4 font-display text-3xl font-medium text-ink">
          Unable to confirm checkout
        </h1>
        <p className="mx-auto mt-2 max-w-md text-base text-ink-soft">{message}</p>
        <div className="mx-auto mt-6 flex max-w-md flex-col gap-3">
          <Link
            href="/dashboard/library"
            className={cn(buttonVariants({ variant: "default", size: "block" }))}
          >
            Go to My Library
          </Link>
          <Link
            href="/dashboard/account"
            className={cn(buttonVariants({ variant: "outline", size: "block" }))}
          >
            View account
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div
        aria-hidden
        className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-soft text-3xl text-green-deep"
      >
        {state === "fulfilled" ? "✓" : "…"}
      </div>
      <h1 className="mt-4 font-display text-3xl font-medium text-ink">
        {state === "fulfilled" ? "Payment successful" : "Payment successful"}
      </h1>
      <p className="mx-auto mt-2 max-w-md text-base text-ink-soft">{message}</p>

      <div className="mx-auto mt-6 max-w-md rounded-[var(--radius-card)] border border-line bg-surface p-5 text-left">
        <p className="text-xs text-ink-soft">Purchase</p>
        <p className="mt-1 font-semibold text-ink">{productName}</p>
        {state === "processing" && !timedOut ? (
          <p className="mt-3 text-sm text-ink-soft" aria-live="polite">
            {isPending ? "Checking access…" : "Waiting for activation…"}
          </p>
        ) : null}
      </div>

      <div className="mx-auto mt-5 flex max-w-md flex-col gap-3">
        {state === "fulfilled" && href && label ? (
          <Link
            href={href}
            className={cn(buttonVariants({ variant: "default", size: "block" }))}
          >
            {label}
          </Link>
        ) : null}

        {timedOut ? (
          <>
            <Link
              href="/dashboard/library"
              className={cn(buttonVariants({ variant: "default", size: "block" }))}
            >
              Go to My Library
            </Link>
            <button
              type="button"
              onClick={handleRetry}
              className={cn(buttonVariants({ variant: "outline", size: "block" }))}
            >
              Check again
            </button>
          </>
        ) : null}

        {state === "processing" && !timedOut ? (
          <Link
            href="/dashboard/library"
            className={cn(buttonVariants({ variant: "outline", size: "block" }))}
          >
            Go to My Library
          </Link>
        ) : null}
      </div>
    </div>
  )
}
