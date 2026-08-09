import type { Metadata } from "next"
import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui"
import { buttonVariants } from "@/components/ui/button"
import { ResendVerificationForm } from "@/features/auth/components/ResendVerificationForm"
import {
  authCallbackErrorMessage,
  isAuthCallbackErrorCode,
  type AuthCallbackErrorCode,
} from "@/lib/config/app-url"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Email confirmation",
  description: "We could not confirm this email link.",
}

function resolveReason(raw: string | undefined): AuthCallbackErrorCode {
  if (isAuthCallbackErrorCode(raw)) {
    return raw
  }
  return "auth_callback_failed"
}

export default async function VerificationFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; email?: string }>
}) {
  const params = await searchParams
  const reason = resolveReason(params.reason)
  const message = authCallbackErrorMessage(reason)
  const showExpiredOrUsed =
    reason === "auth_callback_expired" || reason === "auth_callback_used"

  return (
    <Card className="mx-auto w-full max-w-[400px]">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-[23px] font-medium">
          We couldn&apos;t confirm this email link
        </CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {showExpiredOrUsed ? (
          <p className="text-sm text-ink-soft">
            Links can only be used once and expire for your security. Send a new
            verification email below.
          </p>
        ) : null}

        <ResendVerificationForm initialEmail={params.email ?? ""} />

        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "outline", size: "block" }))}
        >
          Return to sign in
        </Link>
      </CardContent>
    </Card>
  )
}
