import type { Metadata } from "next"
import Link from "next/link"

import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm"

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your account.",
}

export default function ResetPasswordPage() {
  return (
    <>
      <ResetPasswordForm />
      <p className="mt-[18px] text-center text-[13.5px] text-ink-soft">
        <Link href="/login" className="font-semibold text-blue hover:text-blue-deep">
          Back to sign in
        </Link>
      </p>
    </>
  )
}
