import * as React from "react"

import { Container } from "@/components/layout/container"
import { Section } from "@/components/layout/section"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { TrustBar } from "@/components/marketing/trust-bar"
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
  mediaLabel?: string
}

function HeroMedia({
  media,
  mediaLabel = "Hero image placeholder",
}: Pick<HeroSectionProps, "media" | "mediaLabel">) {
  if (media) {
    return <div className="min-h-[330px] w-full">{media}</div>
  }

  return (
    <div
      aria-hidden
      className="flex aspect-[4/5] min-h-[330px] items-center justify-center rounded-2xl border border-line bg-linear-to-br from-blue-soft to-green-soft p-3.5 text-center font-body text-[13px] italic text-ink-soft"
    >
      {mediaLabel}
    </div>
  )
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
  mediaLabel,
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

          <HeroMedia media={media} mediaLabel={mediaLabel} />
        </div>
      </Container>
    </Section>
  )
}

export { HeroSection, type HeroAction, type HeroSectionProps }
