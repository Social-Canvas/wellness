import type { Metadata } from "next"
import Link from "next/link"

import { Container, Section } from "@/components/layout"
import { BrandImage } from "@/components/media"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"
import { BRAND_IMAGES } from "@/lib/brand/images"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: `About — ${ELEVATE_BRAND.name}`,
  description:
    "Meet Dr. Deepa Pattani — Doctor of Pharmacy, functional medicine specialist, and founder of Elevate Health Solutions.",
}

const CREDENTIALS = [
  "Doctor of Pharmacy",
  "Certified Functional Medicine Specialist",
  "Board-Certified Breathwork Practitioner",
  "Reiki & Sound Healing Facilitator",
  "LDN Compounder",
  "CBD Specialist",
]

const PRESS = ["Forbes", "Authority Magazine", "Dallas Voyage Magazine"]

const APPROACH_PILLARS = [
  {
    title: "Science + soul",
    description:
      "Clinical pharmacology meets herbalism, Ayurveda, and breathwork — precision without losing the human element.",
  },
  {
    title: "Root-cause healing",
    description:
      "Symptoms are signals. Elevate identifies what is driving dysregulation — nervous system, hormones, gut, inflammation.",
  },
  {
    title: "Nervous system first",
    description:
      "Lasting change requires safety in the body. Breathwork and regulation practices are woven through every program.",
  },
]

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
              <Badge variant="eyebrow">About {ELEVATE_BRAND.name}</Badge>
              <h1 className="mt-2 font-display text-[clamp(1.5625rem,3.3vw,2.25rem)] font-medium tracking-tight text-ink">
                Meet {ELEVATE_BRAND.founder}
              </h1>
              <p className="mt-4 text-base leading-relaxed text-ink-soft">
                {ELEVATE_BRAND.founderTitle}. Founder of {ELEVATE_BRAND.name} and
                creator of the science + soul approach to nervous system regulation and
                functional healing.
              </p>
              <p className="mt-4 text-base leading-relaxed text-ink-soft">
                For over two decades, Dr. Pattani has helped exhausted, overwhelmed
                professionals break free from fatigue, anxiety, and hopelessness — and
                step into energy, control, and vibrant health through the signature
                7-Step PATTANI Protocol.
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {CREDENTIALS.map((credential) => (
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

          <div className="mx-auto mt-14 max-w-[51.25rem] space-y-10">
            <section>
              <h2 className="font-display text-[26px] font-medium text-ink">
                A third-generation healer
              </h2>
              <p className="mt-3 text-[17px] leading-[1.75] text-ink-soft">
                Healing runs in her blood. A personal transformation in Bali — where
                traditional practices met modern medical science — confirmed what years of
                clinical work had shown: sustainable healing requires both evidence and
                embodiment.
              </p>
              <p className="mt-4 text-[17px] leading-[1.75] text-ink-soft">
                After losing 40 pounds without pharmaceuticals using the same holistic
                tools she now teaches, Dr. Pattani committed fully to functional medicine
                — finding and fixing root causes rather than managing symptoms on the
                surface.
              </p>
            </section>

            <section>
              <h2 className="font-display text-[26px] font-medium text-ink">
                Featured in
              </h2>
              <div className="mt-3 flex flex-wrap gap-3">
                {PRESS.map((outlet) => (
                  <span
                    key={outlet}
                    className="rounded-[30px] border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink"
                  >
                    {outlet}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-[17px] leading-[1.75] text-ink-soft">
                Best-selling author of <em>Unleashing the Storrie Within</em> and
                contributing author to the Amazon bestseller{" "}
                <em>Creating a Functional Medicine Revolution</em>. She is currently
                writing <em>The Earth is My Body</em> — the first in a series on human
                healing and the natural world.
              </p>
            </section>

            <section className="grid gap-5 min-[861px]:grid-cols-3">
              {APPROACH_PILLARS.map((pillar) => (
                <div
                  key={pillar.title}
                  className="rounded-2xl border border-line bg-surface p-6 shadow-sm"
                >
                  <h3 className="font-display text-lg font-medium text-ink">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {pillar.description}
                  </p>
                </div>
              ))}
            </section>

            <section>
              <h2 className="font-display text-[26px] font-medium text-ink">
                The Elevate breathwork journey
              </h2>
              <p className="mt-3 text-[17px] leading-[1.75] text-ink-soft">
                Membership follows a three-year framework — Ground → Release → Align →
                Expand — designed for long-term nervous system transformation, not
                quick fixes.
              </p>
            </section>

            <section className="rounded-2xl border border-line bg-cream2/60 p-8 text-center">
              <p className="font-display text-xl font-medium text-ink">
                &ldquo;Healing is not something we force — it is something we allow when
                we return to ourselves.&rdquo;
              </p>
              <p className="mt-3 text-sm text-ink-soft">— {ELEVATE_BRAND.founder}</p>
            </section>

            <div className="text-center">
              <Link
                href="/programs"
                className={cn(buttonVariants({ variant: "default", size: "default" }))}
              >
                Explore memberships
              </Link>
            </div>
          </div>
        </Container>
      </Section>
    </main>
  )
}
