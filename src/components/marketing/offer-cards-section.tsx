import Link from "next/link"
import * as React from "react"

import { BrandImage } from "@/components/media"
import { Container } from "@/components/layout/container"
import { Section } from "@/components/layout/section"
import { SectionHeader } from "@/components/layout/section-header"
import { buttonVariants } from "@/components/ui/button"
import type { BrandImageAsset } from "@/lib/brand/images"
import { cn } from "@/lib/utils"

type OfferCard = {
  category: string
  title: string
  description: string
  price: React.ReactNode
  href: string
  ctaLabel?: string
  image: BrandImageAsset
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
              className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-sm"
            >
              <div className="relative aspect-video overflow-hidden">
                <BrandImage
                  image={card.image}
                  containerClassName="absolute inset-0"
                  sizes="(max-width: 860px) 100vw, 33vw"
                />
                <span className="absolute top-3 left-3 rounded-[20px] bg-[rgba(255,255,255,0.9)] px-2.5 py-1.5 text-[11px] font-bold tracking-[0.06em] text-green-deep uppercase backdrop-blur-sm">
                  {card.category}
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
