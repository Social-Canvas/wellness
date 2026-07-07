import type { Metadata } from "next"
import Link from "next/link"

import { Container, Section } from "@/components/layout"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "About",
  description: "Meet the founder and learn about our mission for root-cause healing.",
}

export default function AboutPage() {
  return (
    <main>
      <Section padding="default">
        <Container>
          <div className="grid items-center gap-12 min-[861px]:grid-cols-[1.05fr_0.95fr]">
            <div
              aria-hidden
              className="flex aspect-[1/1.05] min-h-[340px] items-center justify-center rounded-2xl border border-line bg-gradient-to-br from-blue-soft to-green-soft text-sm italic text-ink-soft"
            >
              Founder portrait placeholder
            </div>

            <div>
              <Badge variant="eyebrow">Meet the founder</Badge>
              <h1 className="mt-2 font-display text-[clamp(1.5625rem,3.3vw,2.25rem)] font-medium tracking-tight text-ink">
                A mission for root-cause healing
              </h1>
              <p className="mt-4 text-base text-ink-soft">
                A certified wellness specialist and best-selling author, our founder helps
                people heal at the root and feel like themselves again. Placeholder bio —
                replace with the client&apos;s real story when available.
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {[
                  "Certified Specialist",
                  "Wellness Practitioner",
                  "Best-selling author",
                  "Featured in the press",
                ].map((credential) => (
                  <span
                    key={credential}
                    className="rounded-[30px] bg-green-soft px-4 py-1.5 text-[13px] font-semibold text-green-deep"
                  >
                    {credential}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mx-auto mt-12 max-w-[51.25rem]">
            <h2 className="font-display text-[26px] font-medium text-ink">Our story</h2>
            <p className="mt-3 text-[17px] leading-[1.75] text-ink-soft">
              Placeholder for the founder&apos;s story. The real bio goes here — this layout
              shows how longer-form narrative content will sit beside a portrait image.
            </p>
            <p className="mt-4 text-[17px] leading-[1.75] text-ink-soft">
              A few short, warm paragraphs can describe the journey, the philosophy, and why
              the brand exists — grounded in holistic wellness and practical education.
            </p>

            <h2 className="mt-8 font-display text-[26px] font-medium text-ink">
              Our approach
            </h2>
            <p className="mt-3 text-[17px] leading-[1.75] text-ink-soft">
              Assessment, personalised guidance, and ongoing support help members heal at the
              root. Membership includes meditation series, core course library content, and
              recorded live sessions added over time.
            </p>

            <div className="mt-8 text-center">
              <Link
                href="/programs"
                className={cn(buttonVariants({ variant: "default", size: "default" }))}
              >
                Explore the programs
              </Link>
            </div>
          </div>
        </Container>
      </Section>
    </main>
  )
}
