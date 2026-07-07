"use client"

import * as React from "react"

import { BrandImage } from "@/components/media"
import { Container } from "@/components/layout/container"
import { Section } from "@/components/layout/section"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BRAND_IMAGES } from "@/lib/brand/images"
import { cn } from "@/lib/utils"

type EmailCaptureSectionProps = React.ComponentProps<"section"> & {
  title: string
  description: string
  submitLabel?: string
  note?: string
}

function EmailCaptureSection({
  className,
  title,
  description,
  submitLabel = "Send my code",
  note = "No spam, just calm. Unsubscribe anytime.",
  ...props
}: EmailCaptureSectionProps) {
  const [email, setEmail] = React.useState("")
  const [submitted, setSubmitted] = React.useState(false)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim()) {
      return
    }

    setSubmitted(true)
  }

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

        {submitted ? (
          <p className="done mt-3.5 font-display text-[17px] text-white">
            Your code: WELCOME10 ✓ Check your inbox.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-[22px] flex max-w-[460px] flex-wrap justify-center gap-2.5"
          >
            <Input
              type="email"
              required
              placeholder="you@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-w-[200px] flex-1 bg-white"
            />
            <button
              type="submit"
              className={cn(
                buttonVariants({ variant: "default", size: "default" }),
                "bg-white text-blue-deep hover:bg-cream"
              )}
            >
              {submitLabel}
            </button>
          </form>
        )}

        <p className="mt-3 text-[12.5px] text-[#E2F0EF]">{note}</p>
      </Container>
    </Section>
  )
}

export { EmailCaptureSection, type EmailCaptureSectionProps }
