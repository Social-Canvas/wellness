import type { Metadata } from "next"
import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui"
import { buttonVariants } from "@/components/ui/button"
import { resolveSafeAuthReturnPath } from "@/features/shop/utils/free-claim"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Email confirmed",
  description: "Your Elevate account email is confirmed.",
}

export default async function VerifiedPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  const continueHref = resolveSafeAuthReturnPath(next)

  return (
    <Card className="mx-auto w-full max-w-[400px]">
      <CardHeader className="text-center">
        <CardTitle className="font-display text-[23px] font-medium">
          Email confirmed
        </CardTitle>
        <CardDescription>
          Your account is ready. Continue to finish setup or open your member
          area.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Link
          href={continueHref}
          className={cn(buttonVariants({ variant: "default", size: "block" }))}
        >
          Continue
        </Link>
        <p className="text-center text-[13.5px] text-ink-soft">
          <Link href="/login" className="font-semibold text-blue hover:text-blue-deep">
            Return to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
