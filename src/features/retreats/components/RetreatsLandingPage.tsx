import { BrandImage } from "@/components/media"
import { Container, Section, SectionHeader } from "@/components/layout"
import { buttonVariants } from "@/components/ui/button"
import { LeadEnquiryForm } from "@/features/leads/components/LeadEnquiryForm"
import { RETREATS_PAGE } from "@/features/retreats/constants/retreats-page"
import { BRAND_IMAGES } from "@/lib/brand/images"
import { cn } from "@/lib/utils"

type RetreatsLandingPageProps = {
  isAuthenticated: boolean
}

function NeutralBrandPanel() {
  return (
    <div
      className="flex aspect-[4/3] w-full items-end bg-gradient-to-br from-cream via-green-soft/50 to-green/20 px-6 py-6"
      aria-hidden
    >
      <span className="font-body text-[11px] font-bold uppercase tracking-[0.14em] text-green-deep">
        Elevate Health
      </span>
    </div>
  )
}

function PastRetreatCard({
  title,
  label,
  description,
  imageKey,
}: {
  title: string
  label: string
  description: string
  imageKey: (typeof RETREATS_PAGE.past.items)[number]["imageKey"]
}) {
  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-[18px] border border-line bg-surface">
      {imageKey ? (
        <BrandImage
          image={BRAND_IMAGES[imageKey]}
          containerClassName="relative aspect-[4/3] w-full"
          sizes="(max-width: 767px) 100vw, 40vw"
        />
      ) : (
        <NeutralBrandPanel />
      )}
      <div className="flex flex-1 flex-col px-6 py-6 min-[768px]:px-7 min-[768px]:py-7">
        <span className="font-body text-[11.5px] font-bold uppercase tracking-[0.12em] text-green-deep">
          {label}
        </span>
        <h3 className="mt-2.5 font-display text-[1.375rem] font-medium leading-snug text-ink min-[768px]:text-[1.5rem]">
          {title}
        </h3>
        <p className="mt-3 font-body text-[14px] leading-[1.7] text-ink-soft">
          {description}
        </p>
      </div>
    </article>
  )
}

function RetreatsLandingPage({ isAuthenticated }: RetreatsLandingPageProps) {
  const { hero, past, expect, upcoming, enquiry } = RETREATS_PAGE

  return (
    <main>
      <Section padding="hero">
        <Container>
          <div className="grid items-center gap-12 min-[861px]:grid-cols-[1.05fr_0.95fr] min-[861px]:gap-12">
            <div className="min-w-0">
              <span className="font-body text-[11.5px] font-bold uppercase tracking-[0.12em] text-green-deep">
                {hero.eyebrow}
              </span>
              <h1 className="mt-3.5 font-display text-[clamp(2rem,4.4vw,3.25rem)] font-medium tracking-tight text-ink">
                {hero.heading}
              </h1>
              <p className="mt-[18px] mb-6 max-w-[31.875rem] font-body text-lg text-ink-soft">
                {hero.body}
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={hero.primaryCta.href}
                  className={cn(
                    buttonVariants({ variant: "default", size: "default" }),
                    "w-full min-[480px]:w-auto"
                  )}
                >
                  {hero.primaryCta.label}
                </a>
                <a
                  href={hero.secondaryCta.href}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "default" }),
                    "w-full min-[480px]:w-auto"
                  )}
                >
                  {hero.secondaryCta.label}
                </a>
              </div>
            </div>
            <BrandImage
              image={BRAND_IMAGES.retreatRiver}
              priority
              containerClassName="aspect-[4/5] min-h-[330px] w-full rounded-2xl border border-line shadow-sm"
              sizes="(max-width: 860px) 100vw, 45vw"
            />
          </div>
        </Container>
      </Section>

      <Section
        id={upcoming.id}
        variant="green"
        padding="default"
        className="scroll-mt-28"
      >
        <Container>
          <div className="grid items-center gap-10 min-[861px]:grid-cols-[1.1fr_0.9fr] min-[861px]:gap-12">
            <div className="min-w-0">
              <span className="font-body text-[11.5px] font-bold uppercase tracking-[0.12em] text-[#9FD0C9]">
                {upcoming.eyebrow}
              </span>
              <h2 className="mt-3.5 font-display text-[clamp(1.75rem,3vw,2.25rem)] font-medium leading-tight text-white">
                {upcoming.heading}
              </h2>
              <p className="mt-3 font-display text-[1.25rem] font-medium text-white/90 min-[768px]:text-[1.375rem]">
                {upcoming.timing}
              </p>
              <p className="mt-5 max-w-[36rem] font-body text-[15px] leading-[1.7] text-[#CDD9D7]">
                {upcoming.intro}
              </p>
              <a
                href={upcoming.ctaHref}
                className={cn(
                  buttonVariants({ variant: "default", size: "default" }),
                  "mt-8 inline-flex w-full bg-white text-ink hover:bg-cream min-[480px]:w-auto"
                )}
              >
                {upcoming.ctaLabel}
              </a>
            </div>
            <BrandImage
              image={BRAND_IMAGES.retreatSpiritual}
              containerClassName="aspect-[4/3] w-full overflow-hidden rounded-[18px]"
              sizes="(max-width: 860px) 100vw, 40vw"
              className="opacity-100"
            />
          </div>
        </Container>
      </Section>

      <Section
        id={expect.id}
        variant="soft"
        padding="default"
        className="scroll-mt-28"
      >
        <Container>
          <SectionHeader
            align="center"
            title={expect.heading}
            subtitle={expect.intro}
          />
          <div className="mt-10 grid grid-cols-1 gap-8 min-[640px]:grid-cols-2 min-[1024px]:grid-cols-3">
            {expect.items.map((item, index) => (
              <div key={item.title} className="min-w-0 border-t border-line pt-5">
                <span className="font-body text-[11px] font-bold uppercase tracking-[0.14em] text-green-deep">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-display text-[1.125rem] font-medium leading-snug text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 font-body text-[14px] leading-[1.7] text-ink-soft">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section
        id={past.id}
        padding="default"
        className="scroll-mt-28"
      >
        <Container>
          <SectionHeader
            align="center"
            title={past.heading}
            subtitle={past.supporting}
          />
          <div className="mt-10 grid grid-cols-1 gap-[18px] min-[768px]:grid-cols-2">
            {past.items.map((item) => (
              <PastRetreatCard
                key={item.id}
                title={item.title}
                label={item.label}
                description={item.description}
                imageKey={item.imageKey}
              />
            ))}
          </div>
        </Container>
      </Section>

      <Section
        id={enquiry.id}
        padding="default"
        className="scroll-mt-28"
      >
        <Container>
          <div className="grid items-start gap-10 min-[861px]:grid-cols-[0.95fr_1.05fr] min-[861px]:gap-12">
            <div className="min-w-0">
              <SectionHeader
                align="left"
                title={enquiry.heading}
                subtitle={enquiry.supporting}
              />
            </div>
            <LeadEnquiryForm
              variant="retreat"
              isAuthenticated={isAuthenticated}
            />
          </div>
        </Container>
      </Section>
    </main>
  )
}

export { RetreatsLandingPage, type RetreatsLandingPageProps }
