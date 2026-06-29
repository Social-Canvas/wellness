import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { SignupForm } from "@/features/auth/components/SignupForm"
import { getCurrentProfile } from "@/features/auth/services/auth.service"

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your member account.",
}

export default async function SignupPage() {
  const profileResult = await getCurrentProfile()

  if (profileResult.success) {
    redirect("/dashboard")
  }

  return (
    <>
      <SignupForm />
      <p className="mt-[18px] text-center text-[13.5px] text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-blue hover:text-blue-deep">
          Sign in
        </Link>
      </p>
    </>
  )
}
