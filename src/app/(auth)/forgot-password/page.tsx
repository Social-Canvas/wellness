import type { Metadata } from "next"
import Link from "next/link"

import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm"

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Request a password reset link for your account.",
}

export default function ForgotPasswordPage() {
  return (
    <>
      <ForgotPasswordForm />
      <p className="mt-[18px] text-center text-[13.5px] text-ink-soft">
        Remember your password?{" "}
        <Link href="/login" className="font-semibold text-blue hover:text-blue-deep">
          Sign in
        </Link>
      </p>
    </>
  )
}
