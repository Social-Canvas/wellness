import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { buildCheckoutConsentUrl } from "@/features/checkout/utils/checkout-urls"
import { cn } from "@/lib/utils"

interface BuyProductButtonProps {
  productSlug: string
  label?: string
}

export function BuyProductButton({
  productSlug,
  label = "Buy now",
}: BuyProductButtonProps) {
  return (
    <Link
      href={buildCheckoutConsentUrl({
        type: "product",
        productSlug,
      })}
      className={cn(buttonVariants({ variant: "default", size: "default" }))}
    >
      {label}
    </Link>
  )
}
