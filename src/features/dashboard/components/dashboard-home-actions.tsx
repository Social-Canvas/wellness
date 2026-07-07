import Link from "next/link"
import { Award, BookOpen, CreditCard, ShoppingBag, Sparkles } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { cn } from "@/lib/utils"

const DASHBOARD_ACTIONS = [
  {
    title: "Continue to Library",
    description: "Pick up where you left off with your courses and lessons.",
    href: "/dashboard/library",
    label: "Open library",
    icon: BookOpen,
  },
  {
    title: "Browse Programs",
    description: "Explore memberships, one-time programs, and live sessions.",
    href: "/programs",
    label: "View programs",
    icon: Sparkles,
  },
  {
    title: "Visit Shop",
    description: "Browse ebooks and digital downloads.",
    href: "/shop",
    label: "Go to shop",
    icon: ShoppingBag,
  },
  {
    title: "Manage Account & Billing",
    description: "Review your profile and subscription details.",
    href: "/dashboard/account",
    label: "Account settings",
    icon: CreditCard,
  },
  {
    title: "View Certificates",
    description: "See certificates you have earned from completed courses.",
    href: "/dashboard/certificates",
    label: "My certificates",
    icon: Award,
  },
] as const

export function DashboardHomeActions() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {DASHBOARD_ACTIONS.map((action) => {
        const Icon = action.icon

        return (
          <Card key={action.href} className="flex flex-col">
            <CardHeader className="space-y-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-blue-soft text-blue">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <CardTitle className="font-display text-lg font-medium text-ink">
                {action.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-auto space-y-4">
              <p className="text-sm text-ink-soft">{action.description}</p>
              <Link
                href={action.href}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                {action.label}
              </Link>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
