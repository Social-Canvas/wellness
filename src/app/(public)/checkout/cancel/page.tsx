import { redirect } from "next/navigation"

type CancelPageProps = {
  searchParams: Promise<{
    type?: string
  }>
}

/** Legacy path — prefer `/checkout/cancelled`. */
export default async function CheckoutCancelRedirectPage({ searchParams }: CancelPageProps) {
  const params = await searchParams
  const search = new URLSearchParams()

  if (params.type === "membership" || params.type === "product") {
    search.set("type", params.type)
  }

  const qs = search.toString()
  redirect(qs ? `/checkout/cancelled?${qs}` : "/checkout/cancelled")
}
