import type { Metadata } from "next"
import Link from "next/link"

import { Container, Section } from "@/components/layout"
import { BrandImage } from "@/components/media"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { BRAND_IMAGES } from "@/lib/brand/images"
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
            <BrandImage
              image={BRAND_IMAGES.founderPortrait}
              priority
              containerClassName="aspect-[1/1.05] min-h-[340px] w-full rounded-2xl border border-line shadow-sm"
              sizes="(max-width: 860px) 100vw, 45vw"
            />

            <div>
              <Badge variant="eyebrow">Meet the founder</Badge>
              <h1 className="mt-2 font-display text-[clamp(1.5625rem,3.3vw,2.25rem)] font-medium tracking-tight text-ink">
                A mission for root-cause healing
              </h1>
              <p className="mt-4 text-base text-ink-soft">
                Dr. Deepa Pattani is a certified wellness specialist and best-selling author who
                helps people heal at the root and feel like themselves again — with over two
                decades of experience guiding clients from stress and fatigue back to energy,
                calm, and control.
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

          <div className="mx-auto mt-12 grid max-w-[51.25rem] gap-10 min-[861px]:grid-cols-[1fr_0.85fr] min-[861px]:items-start">
            <div>
              <h2 className="font-display text-[26px] font-medium text-ink">Our story</h2>
              <p className="mt-3 text-[17px] leading-[1.75] text-ink-soft">
                Elevate Health Solutions was built on a simple belief: lasting wellness begins
                when you understand why you feel the way you do — not just how to manage the
                symptoms.
              </p>
              <p className="mt-4 text-[17px] leading-[1.75] text-ink-soft">
                From guided meditation and breathwork to nutrition, coaching, and immersive
                retreats, every program is designed to meet you where you are and help you
                build sustainable change.
              </p>

              <h2 className="mt-8 font-display text-[26px] font-medium text-ink">
                Our approach
              </h2>
              <p className="mt-3 text-[17px] leading-[1.75] text-ink-soft">
                Assessment, personalised guidance, and ongoing support help members heal at the
                root. Membership includes meditation series, core course library content, and
                recorded live sessions added over time.
              </p>

              <div className="mt-8">
                <Link
                  href="/programs"
                  className={cn(buttonVariants({ variant: "default", size: "default" }))}
                >
                  Explore the programs
                </Link>
              </div>
            </div>

            <BrandImage
              image={BRAND_IMAGES.lifestyleJournal}
              containerClassName="aspect-[4/5] w-full overflow-hidden rounded-2xl border border-line shadow-sm"
              sizes="(max-width: 860px) 100vw, 35vw"
            />
          </div>
        </Container>
      </Section>
    </main>
  )
}
