import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { SignupForm } from "@/features/auth/components/SignupForm"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { resolveSafeAuthReturnPath } from "@/features/shop/utils/free-claim"

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your member account.",
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const profileResult = await getCurrentProfile()
  const { next } = await searchParams
  const redirectTo = resolveSafeAuthReturnPath(next)

  if (profileResult.success) {
    redirect(redirectTo)
  }

  return (
    <>
      <SignupForm redirectTo={redirectTo} />
      <p className="mt-[18px] text-center text-[13.5px] text-ink-soft">
        Already have an account?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(redirectTo)}`}
          className="font-semibold text-blue hover:text-blue-deep"
        >
          Sign in
        </Link>
      </p>
    </>
  )
}
