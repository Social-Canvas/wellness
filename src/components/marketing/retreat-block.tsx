import Link from "next/link"
import * as React from "react"

import { Container } from "@/components/layout/container"
import { Section } from "@/components/layout/section"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type RetreatBlockProps = React.ComponentProps<"section"> & {
  eyebrow: string
  title: string
  description: string
  cta: { label: string; href: string }
  imageLabel?: string
}

function RetreatBlock({
  className,
  eyebrow,
  title,
  description,
  cta,
  imageLabel = "Retreat image placeholder",
  ...props
}: RetreatBlockProps) {
  return (
    <Section className={className} {...props}>
      <Container>
        <div className="grid items-center gap-[42px] min-[861px]:grid-cols-2">
          <div
            aria-hidden
            className="flex aspect-[5/4] min-h-[300px] items-center justify-center rounded-2xl border border-line bg-gradient-to-br from-blue-soft to-green-soft p-3.5 text-center text-[13px] italic text-ink-soft"
          >
            {imageLabel}
          </div>

          <div>
            <Badge variant="eyebrow">{eyebrow}</Badge>
            <h2 className="mt-1.5 font-display text-[clamp(1.5625rem,3.3vw,2.25rem)] font-medium tracking-tight text-ink">
              {title}
            </h2>
            <p className="mt-3.5 mb-[22px] text-base text-ink-soft">{description}</p>
            <Link
              href={cta.href}
              className={cn(buttonVariants({ variant: "default", size: "default" }))}
            >
              {cta.label}
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  )
}

export { RetreatBlock, type RetreatBlockProps }
