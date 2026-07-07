import * as React from "react"

import { BrandImage } from "@/components/media"
import { Container } from "@/components/layout/container"
import { Section } from "@/components/layout/section"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { TrustBar } from "@/components/marketing/trust-bar"
import { BRAND_IMAGES } from "@/lib/brand/images"
import { cn } from "@/lib/utils"

type HeroAction = {
  label: string
  href: string
  variant?: "primary" | "ghost"
}

type HeroSectionProps = React.ComponentProps<"section"> & {
  eyebrow: string
  title: string
  highlightedTitle?: string
  description: string
  actions: HeroAction[]
  trustItems?: string[]
  media?: React.ReactNode
  image?: (typeof BRAND_IMAGES)[keyof typeof BRAND_IMAGES]
}

function HeroSection({
  className,
  eyebrow,
  title,
  highlightedTitle,
  description,
  actions,
  trustItems,
  media,
  image = BRAND_IMAGES.heroBreathwork,
  ...props
}: HeroSectionProps) {
  return (
    <Section padding="hero" className={className} {...props}>
      <Container>
        <div className="grid items-center gap-12 min-[861px]:grid-cols-[1.05fr_0.95fr] min-[861px]:gap-12">
          <div>
            <Badge variant="eyebrow">{eyebrow}</Badge>

            <h1 className="mt-3.5 font-display text-[clamp(2rem,4.4vw,3.25rem)] font-medium tracking-tight text-ink">
              {title}
              {highlightedTitle ? (
                <>
                  {" "}
                  <em className="font-display italic text-blue">
                    {highlightedTitle}
                  </em>
                </>
              ) : null}
            </h1>

            <p className="mt-[18px] mb-6 max-w-[31.875rem] font-body text-lg text-ink-soft">
              {description}
            </p>

            {actions.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {actions.map((action) => (
                  <a
                    key={`${action.href}-${action.label}`}
                    href={action.href}
                    className={cn(
                      buttonVariants({
                        variant:
                          action.variant === "ghost" ? "outline" : "default",
                        size: "default",
                      })
                    )}
                  >
                    {action.label}
                  </a>
                ))}
              </div>
            ) : null}

            {trustItems?.length ? (
              <TrustBar items={trustItems} className="mt-[34px]" />
            ) : null}
          </div>

          {media ?? (
            <BrandImage
              image={image}
              priority
              containerClassName="aspect-[4/5] min-h-[330px] w-full rounded-2xl border border-line shadow-sm"
              sizes="(max-width: 860px) 100vw, 45vw"
            />
          )}
        </div>
      </Container>
    </Section>
  )
}

export { HeroSection, type HeroAction, type HeroSectionProps }
