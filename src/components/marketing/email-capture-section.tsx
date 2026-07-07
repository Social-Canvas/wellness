"use client"

import Link from "next/link"
import * as React from "react"

import { BrandImage } from "@/components/media"
import { Container } from "@/components/layout/container"
import { Section } from "@/components/layout/section"
import { buttonVariants } from "@/components/ui/button"
import { BRAND_IMAGES } from "@/lib/brand/images"
import { cn } from "@/lib/utils"

type EmailCaptureSectionProps = React.ComponentProps<"section"> & {
  title: string
  description: string
  submitLabel?: string
  note?: string
  href?: string
}

function EmailCaptureSection({
  className,
  title,
  description,
  submitLabel = "Request free taster",
  note = "No spam, just calm. Unsubscribe anytime.",
  href = "/free-taster",
  ...props
}: EmailCaptureSectionProps) {
  return (
    <Section variant="primary" className={cn("relative overflow-hidden text-center", className)} {...props}>
      <div className="absolute inset-0">
        <BrandImage
          image={BRAND_IMAGES.meditationHands}
          containerClassName="h-full w-full"
          sizes="100vw"
          className="opacity-25"
        />
        <div className="absolute inset-0 bg-ink/80" aria-hidden />
      </div>

      <Container className="relative z-10">
        <h2 className="font-display text-[clamp(1.5rem,3.2vw,2.125rem)] font-medium text-white">
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-[480px] text-[#E2F0EF]">{description}</p>

        <Link
          href={href}
          className={cn(
            buttonVariants({ variant: "default", size: "default" }),
            "mt-[22px] bg-white text-blue-deep hover:bg-cream"
          )}
        >
          {submitLabel}
        </Link>

        <p className="mt-3 text-[12.5px] text-[#E2F0EF]">{note}</p>
      </Container>
    </Section>
  )
}

export { EmailCaptureSection, type EmailCaptureSectionProps }
