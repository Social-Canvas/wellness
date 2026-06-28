import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { LoginForm } from "@/features/auth/components/LoginForm"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your member account.",
}

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <>
      <LoginForm />
      <p className="mt-[18px] text-center text-[13.5px] text-ink-soft">
        <Link href="/signup" className="font-semibold text-blue hover:text-blue-deep">
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
