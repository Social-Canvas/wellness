import type { Metadata } from "next"
import Link from "next/link"

import {
  FaqAccordion,
  HeroSection,
  StepsGrid,
  type HeroAction,
} from "@/components/marketing"
import { Container, Section } from "@/components/layout"
import { buttonVariants } from "@/components/ui/button"
import {
  HomepageMembershipOffers,
  ResetPlanOfferBand,
} from "@/features/checkout/components"
import {
  HOMEPAGE_NONPROFIT_SECTION,
  NONPROFIT_EXPLORE_CTA,
  NONPROFIT_INQUIRY_CTA,
  NONPROFIT_INQUIRY_HREF,
  NONPROFIT_LANDING_HREF,
} from "@/features/checkout/utils/membership-audience"
import { parseBillingParam } from "@/features/checkout/utils/membership-billing"
import { VideoTestimonialsSection } from "@/features/marketing-testimonials"
import {
  HOMEPAGE_VIDEO_TESTIMONIALS,
  VIDEO_TESTIMONIALS_SECTION,
} from "@/features/marketing-testimonials/data/testimonials"
import {
  applyTestimonialCopy,
  readFaqItems,
  readMembershipCopy,
  readSiteAlt,
  readSiteLines,
  readSiteText,
} from "@/features/site-content/resolve"
import { loadSiteContent } from "@/features/site-content/services/site-content.service"
import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"
import { BRAND_IMAGES } from "@/lib/brand/images"
import { SITE_SEO, buildPublicPageMetadata } from "@/lib/seo/site-seo"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const content = await loadSiteContent()
  return buildPublicPageMetadata({
    title: readSiteText(content, "homepage.seo.title", SITE_SEO.homeTitle),
    description: readSiteText(content, "homepage.seo.description", SITE_SEO.homeDescription),
    path: "/",
    absoluteTitle: true,
    image: {
      url: readSiteText(content, "global.seo.og_image", SITE_SEO.ogImage.path),
      alt: readSiteAlt(content, "global.seo.og_image") || SITE_SEO.ogImage.alt,
    },
  })
}

const HERO_EYEBROW = ELEVATE_BRAND.philosophy

const HERO_TITLE = "Regulate your nervous system."

const HERO_HIGHLIGHTED_TITLE = "Heal at the root."

const HERO_DESCRIPTION =
  "Elevate Health Solutions blends functional medicine, breathwork, and evidence-informed healing to help high-performing professionals move beyond burnout, anxiety, and depletion into clarity, resilience, and vibrant health."

const HERO_ACTIONS: HeroAction[] = [
  { label: "Start Reset Plan", href: "/programs#reset-plan", variant: "primary" },
  { label: "Explore memberships", href: "#memberships", variant: "ghost" },
]

const JOURNEY_STEPS = [
  {
    number: "1",
    title: "Ground",
    description:
      "Nervous system safety first: release survival mode, reduce burnout, and teach the body it is safe to rest.",
  },
  {
    number: "2",
    title: "Release",
    description:
      "Move stored stress and emotional patterns through guided breathwork, gut support, and hormonal balance.",
  },
  {
    number: "3",
    title: "Align & expand",
    description:
      "Embody sustainable transformation: clarity, resilience, purpose, and leadership from a regulated nervous system.",
  },
]

type HomePageProps = {
  searchParams: Promise<{
    billing?: string | string[]
  }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams
  const initialBilling = parseBillingParam(params.billing)
  const content = await loadSiteContent()
  const heroImage = readSiteText(content, "homepage.hero.image", BRAND_IMAGES.founderTempleMeditation.src)

  return (
    <main>
      <HeroSection
        eyebrow={readSiteText(content, "homepage.hero.eyebrow", HERO_EYEBROW)}
        title={readSiteText(content, "homepage.hero.title", HERO_TITLE)}
        highlightedTitle={readSiteText(content, "homepage.hero.highlighted", HERO_HIGHLIGHTED_TITLE)}
        description={readSiteText(content, "homepage.hero.description", HERO_DESCRIPTION)}
        actions={[
          {
            label: readSiteText(content, "homepage.hero.primary_cta", HERO_ACTIONS[0].label),
            href: readSiteText(content, "homepage.hero.primary_href", HERO_ACTIONS[0].href),
            variant: "primary",
          },
          {
            label: readSiteText(content, "homepage.hero.secondary_cta", HERO_ACTIONS[1].label),
            href: readSiteText(content, "homepage.hero.secondary_href", HERO_ACTIONS[1].href),
            variant: "ghost",
          },
        ]}
        trustItems={readSiteLines(content, "homepage.hero.trust")}
        image={{
          src: heroImage,
          alt: readSiteAlt(content, "homepage.hero.image") || BRAND_IMAGES.founderTempleMeditation.alt,
          objectPosition: heroImage.startsWith("/") ? BRAND_IMAGES.founderTempleMeditation.objectPosition : undefined,
        }}
      />

      <StepsGrid
        eyebrow={readSiteText(content, "homepage.journey.eyebrow", "The Elevate journey")}
        title={readSiteText(content, "homepage.journey.title", "A structured path to nervous system transformation")}
        steps={JOURNEY_STEPS.map((step, index) => ({
          ...step,
          title: readSiteText(content, `homepage.journey.${index + 1}.title`, step.title),
          description: readSiteText(content, `homepage.journey.${index + 1}.body`, step.description),
        }))}
      />

      <Section padding="default">
        <Container>
          <ResetPlanOfferBand contained={false} />
        </Container>
      </Section>

      <HomepageMembershipOffers
        initialBilling={initialBilling}
        marketingCopy={readMembershipCopy(content)}
        footerCta={{ label: "View all programs & sessions", href: "/programs" }}
      />

      <Section id="for-nonprofits" variant="soft" padding="default">
        <Container className="mx-auto max-w-3xl text-center">
          <p className="font-body text-[11.5px] font-bold uppercase tracking-[0.12em] text-green-deep">
            {readSiteText(content, "homepage.nonprofit.eyebrow", HOMEPAGE_NONPROFIT_SECTION.eyebrow)}
          </p>
          <h2 className="mt-2 font-display text-[clamp(1.375rem,2.8vw,1.875rem)] font-medium text-ink">
            {readSiteText(content, "homepage.nonprofit.heading", HOMEPAGE_NONPROFIT_SECTION.heading)}
          </h2>
          <p className="mx-auto mt-3 max-w-[540px] text-base leading-relaxed text-ink-soft">
            {readSiteText(content, "homepage.nonprofit.body", HOMEPAGE_NONPROFIT_SECTION.body)}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={NONPROFIT_LANDING_HREF}
              className={cn(buttonVariants({ variant: "default", size: "default" }))}
            >
              {readSiteText(content, "homepage.nonprofit.cta", NONPROFIT_EXPLORE_CTA)}
            </Link>
            <Link
              href={NONPROFIT_INQUIRY_HREF}
              className={cn(buttonVariants({ variant: "outline", size: "default" }))}
            >
              {NONPROFIT_INQUIRY_CTA}
            </Link>
          </div>
        </Container>
      </Section>

      <VideoTestimonialsSection
        testimonials={applyTestimonialCopy(HOMEPAGE_VIDEO_TESTIMONIALS, content)}
        section={{
          eyebrow: readSiteText(content, "testimonials.eyebrow", VIDEO_TESTIMONIALS_SECTION.eyebrow),
          title: readSiteText(content, "testimonials.title", VIDEO_TESTIMONIALS_SECTION.title),
          subtitle: readSiteText(content, "testimonials.subtitle", VIDEO_TESTIMONIALS_SECTION.subtitle),
        }}
      />

      <FaqAccordion
        eyebrow={readSiteText(content, "homepage.faq.eyebrow", "Questions, answered")}
        title={readSiteText(content, "homepage.faq.title", "Before you begin")}
        items={readFaqItems(content)}
      />
    </main>
  )
}
