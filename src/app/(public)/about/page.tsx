import type { Metadata } from "next"
import Link from "next/link"

import { Container, Section } from "@/components/layout"
import { BrandImage } from "@/components/media"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { JsonLdScript } from "@/components/seo/json-ld-script"
import { readPressLines, readSiteLines, readSiteParagraphs, readSiteText, readSiteAlt } from "@/features/site-content/resolve"
import { loadSiteContent } from "@/features/site-content/services/site-content.service"
import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"
import {
  PUBLIC_FACEBOOK_GROUP_LINK,
  PUBLIC_SOCIAL_PROFILE_LINKS,
} from "@/lib/constants/social-links"
import { BRAND_IMAGES } from "@/lib/brand/images"
import { buildPublicPageMetadata, personJsonLd } from "@/lib/seo/site-seo"
import { cn } from "@/lib/utils"

const ABOUT_SOCIAL_LINK_LABELS = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  facebookCommunity: "Facebook community",
} as const

export async function generateMetadata(): Promise<Metadata> {
  const content = await loadSiteContent()
  return buildPublicPageMetadata({
    title: "About",
    description: readSiteText(
      content,
      "about.seo.description",
      "Meet Dr. Deepa Pattani, Doctor of Pharmacy, functional medicine specialist, and founder of Elevate Health Solutions."
    ),
    path: "/about",
  })
}

const APPROACH_PILLARS = [
  {
    title: "Science + soul",
    description:
      "Clinical pharmacology meets herbalism, Ayurveda, and breathwork, with precision that does not lose the human element.",
  },
  {
    title: "Root-cause healing",
    description:
      "Symptoms are signals. Elevate identifies what is driving dysregulation: nervous system, hormones, gut, inflammation.",
  },
  {
    title: "Nervous system first",
    description:
      "Lasting change requires safety in the body. Breathwork and regulation practices are woven through every program.",
  },
]

export default async function AboutPage() {
  const content = await loadSiteContent()
  const intro = readSiteParagraphs(content, "about.intro")
  const healer = readSiteParagraphs(content, "about.healer")
  const credentials = readSiteLines(content, "about.credentials")
  const press = readPressLines(content)
  const portraitSrc = readSiteText(content, "about.portrait", BRAND_IMAGES.founderPortrait.src)

  return (
    <main>
      <JsonLdScript data={personJsonLd()} />
      <Section padding="default">
        <Container>
          <div className="grid items-center gap-12 min-[861px]:grid-cols-[1.05fr_0.95fr]">
            <BrandImage
              image={{
                src: portraitSrc,
                alt: readSiteAlt(content, "about.portrait") || BRAND_IMAGES.founderPortrait.alt,
                objectPosition: portraitSrc.startsWith("/")
                  ? BRAND_IMAGES.founderPortrait.objectPosition
                  : undefined,
              }}
              priority
              containerClassName="aspect-[1/1.05] min-h-[340px] w-full rounded-2xl border border-line shadow-sm"
              sizes="(max-width: 860px) 100vw, 45vw"
            />

            <div>
              <Badge variant="eyebrow">About {ELEVATE_BRAND.name}</Badge>
              <h1 className="mt-2 font-display text-[clamp(1.5625rem,3.3vw,2.25rem)] font-medium tracking-tight text-ink">
                Meet {ELEVATE_BRAND.founder}
              </h1>
              {intro.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-base leading-relaxed text-ink-soft">
                  {paragraph}
                </p>
              ))}
              <div className="mt-5 flex flex-wrap gap-2.5">
                {credentials.map((credential, index) => (
                  <span
                    key={credential}
                    className={
                      index < 2
                        ? "rounded-[30px] border border-green/40 bg-green-soft px-4 py-1.5 text-[13px] font-semibold text-green-deep"
                        : "rounded-[30px] bg-cream px-4 py-1.5 text-[13px] font-semibold text-ink-soft"
                    }
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
              {healer.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-[17px] leading-[1.75] text-ink-soft">
                  {paragraph}
                </p>
              ))}
            </section>

            <section>
              <h2 className="font-display text-[26px] font-medium text-ink">
                Featured in
              </h2>
              <div className="mt-3 flex flex-wrap gap-3">
                {press.map((outlet) =>
                  outlet.url ? (
                    <a
                      key={outlet.name}
                      href={outlet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-[30px] border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink"
                    >
                      {outlet.name}
                    </a>
                  ) : (
                    <span
                      key={outlet.name}
                      className="rounded-[30px] border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink"
                    >
                      {outlet.name}
                    </span>
                  )
                )}
              </div>
              <p className="mt-4 text-[17px] leading-[1.75] text-ink-soft">
                {readSiteText(content, "about.books")}
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
                Membership follows a three-year framework (Ground → Release → Align →
                Expand) designed for long-term nervous system transformation, not
                quick fixes.
              </p>
            </section>

            <section className="rounded-2xl border border-line bg-cream2/60 p-8 text-center">
              <p className="font-display text-xl font-medium text-ink">
                &ldquo;{readSiteText(content, "about.quote")}&rdquo;
              </p>
              <p className="mt-3 text-sm text-ink-soft">{ELEVATE_BRAND.founder}</p>
            </section>

            <section>
              <h2 className="font-display text-[26px] font-medium text-ink">
                Connect with {ELEVATE_BRAND.founder}
              </h2>
              <p className="mt-3 text-[17px] leading-[1.75] text-ink-soft">
                Follow Elevate and Dr. Pattani on social, or join the community focused on
                natural autoimmune and pre-autoimmune healing.
              </p>
              <nav
                aria-label="Social media"
                className="mt-5 flex flex-wrap gap-x-5 gap-y-3"
              >
                {PUBLIC_SOCIAL_PROFILE_LINKS.map((link) => (
                  <a
                    key={link.network}
                    href={readSiteText(
                      content,
                      link.network === "instagram"
                        ? "global.social.instagram"
                        : link.network === "facebook"
                          ? "global.social.facebook"
                          : "global.social.linkedin",
                      link.href
                    )}
                    target={link.target}
                    rel={link.rel}
                    aria-label={link.ariaLabel}
                    className="inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-blue underline-offset-2 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                  >
                    {ABOUT_SOCIAL_LINK_LABELS[link.network]}
                  </a>
                ))}
                <a
                  href={readSiteText(content, "global.social.facebook_group", PUBLIC_FACEBOOK_GROUP_LINK.href)}
                  target={PUBLIC_FACEBOOK_GROUP_LINK.target}
                  rel={PUBLIC_FACEBOOK_GROUP_LINK.rel}
                  aria-label={PUBLIC_FACEBOOK_GROUP_LINK.ariaLabel}
                  title={PUBLIC_FACEBOOK_GROUP_LINK.description}
                  className="inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-blue underline-offset-2 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                >
                  {ABOUT_SOCIAL_LINK_LABELS.facebookCommunity}
                </a>
              </nav>
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
