import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { LoginForm } from "@/features/auth/components/LoginForm"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { isCertificateNameLocked } from "@/features/auth/utils/certificate-name"
import { resolveSafeAuthReturnPath } from "@/features/shop/utils/free-claim"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your member account.",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const profileResult = await getCurrentProfile()
  const { next } = await searchParams
  const redirectTo = resolveSafeAuthReturnPath(next)

  if (profileResult.success) {
    if (!isCertificateNameLocked(profileResult.data)) {
      redirect(
        `/certificate-name?next=${encodeURIComponent(redirectTo)}`
      )
    }
    redirect(redirectTo)
  }

  return (
    <>
      <LoginForm redirectTo={redirectTo} />
      <p className="mt-[18px] text-center text-[13.5px] text-ink-soft">
        <Link
          href={`/signup?next=${encodeURIComponent(redirectTo)}`}
          className="font-semibold text-blue hover:text-blue-deep"
        >
          Create an account
        </Link>
        <span className="mx-1.5">·</span>
        <Link
          href="/forgot-password"
          className="font-semibold text-blue hover:text-blue-deep"
        >
          Forgot password?
        </Link>
      </p>
    </>
  )
}
