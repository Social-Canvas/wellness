import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { SignupForm } from "@/features/auth/components/SignupForm"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your member account.",
}

export default async function SignupPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
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
