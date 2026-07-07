import Link from "next/link"
import * as React from "react"

import { BrandImage } from "@/components/media"
import { Container } from "@/components/layout/container"
import { Section } from "@/components/layout/section"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import type { BrandImageAsset } from "@/lib/brand/images"
import { BRAND_IMAGES } from "@/lib/brand/images"
import { cn } from "@/lib/utils"

type RetreatBlockProps = React.ComponentProps<"section"> & {
  eyebrow: string
  title: string
  description: string
  cta: { label: string; href: string }
  image?: BrandImageAsset
}

function RetreatBlock({
  className,
  eyebrow,
  title,
  description,
  cta,
  image = BRAND_IMAGES.retreatRiver,
  ...props
}: RetreatBlockProps) {
  return (
    <Section className={className} {...props}>
      <Container>
        <div className="grid items-center gap-[42px] min-[861px]:grid-cols-2">
          <BrandImage
            image={image}
            containerClassName="aspect-[5/4] min-h-[300px] w-full rounded-2xl border border-line shadow-sm"
            sizes="(max-width: 860px) 100vw, 50vw"
          />

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
