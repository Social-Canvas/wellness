import Link from "next/link"

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui"
import { BrandImage } from "@/components/media"
import type { MembershipLibraryCardView } from "@/features/dashboard/utils/library-membership"
import { BRAND_IMAGES } from "@/lib/brand/images"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type MembershipLibraryCardProps = {
  membership: MembershipLibraryCardView
}

export function MembershipLibraryCard({
  membership,
}: MembershipLibraryCardProps) {
  return (
    <Link
      href={membership.ctaHref}
      className="group block focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      data-membership-library-card
    >
      <Card className="h-full overflow-hidden transition-colors group-hover:border-blue/30 group-hover:bg-blue-soft/20">
        <BrandImage
          image={BRAND_IMAGES.coachingVirtual}
          containerClassName="aspect-[16/9] w-full border-b border-line"
          sizes="(max-width: 860px) 100vw, 33vw"
        />
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CardTitle className="font-display text-xl font-medium group-hover:text-blue-deep">
              {membership.planName}
            </CardTitle>
            <Badge variant="plan">{membership.planBadge}</Badge>
          </div>
          <CardDescription>
            Access source: {membership.accessSourceLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-1.5 text-sm text-ink-soft">
            {membership.benefits.map((benefit) => (
              <li key={benefit}>· {benefit}</li>
            ))}
          </ul>
          <span
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            {membership.ctaLabel}
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}
