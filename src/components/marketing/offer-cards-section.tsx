import Link from "next/link"
import * as React from "react"

import { Container } from "@/components/layout/container"
import { Section } from "@/components/layout/section"
import { SectionHeader } from "@/components/layout/section-header"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type OfferCard = {
  category: string
  title: string
  description: string
  price: React.ReactNode
  href: string
  ctaLabel?: string
}

type OfferCardsSectionProps = React.ComponentProps<"section"> & {
  eyebrow?: string
  title: string
  cards: OfferCard[]
  footerCta?: { label: string; href: string }
}

function OfferCardsSection({
  className,
  eyebrow,
  title,
  cards,
  footerCta,
  ...props
}: OfferCardsSectionProps) {
  return (
    <Section className={className} {...props}>
      <Container className="text-center">
        <SectionHeader align="center" eyebrow={eyebrow} title={title} />

        <div className="mt-10 grid grid-cols-1 gap-5 min-[861px]:grid-cols-3">
          {cards.map((card) => (
            <article
              key={card.title}
              className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left"
            >
              <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-blue-soft to-green-soft">
                <span className="absolute top-3 left-3 rounded-[20px] bg-[rgba(255,255,255,0.85)] px-2.5 py-1.5 text-[11px] font-bold tracking-[0.06em] text-green-deep uppercase">
                  {card.category}
                </span>
                <span
                  aria-hidden
                  className="flex size-[42px] items-center justify-center rounded-full bg-blue"
                >
                  <span className="ml-0.5 border-y-8 border-l-[13px] border-y-transparent border-l-white" />
                </span>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h4 className="font-display text-lg font-medium text-ink">{card.title}</h4>
                <p className="mt-1.5 mb-3.5 text-sm text-ink-soft">{card.description}</p>
                <div className="mt-auto flex items-center justify-between gap-3">
                  <span className="font-display text-lg font-semibold text-ink">
                    {card.price}
                  </span>
                  <Link
                    href={card.href}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    {card.ctaLabel ?? "Learn more"}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {footerCta ? (
          <div className="mt-8">
            <Link
              href={footerCta.href}
              className={cn(buttonVariants({ variant: "default", size: "default" }))}
            >
              {footerCta.label}
            </Link>
          </div>
        ) : null}
      </Container>
    </Section>
  )
}

export { OfferCardsSection, type OfferCard, type OfferCardsSectionProps }
