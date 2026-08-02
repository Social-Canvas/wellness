import { Badge } from "@/components/ui/badge"

type EnquiryHeroProps = {
  eyebrow: string
  heading: string
  description: string
}

function EnquiryHero({ eyebrow, heading, description }: EnquiryHeroProps) {
  return (
    <>
      <Badge variant="eyebrow">{eyebrow}</Badge>
      <h1 className="mt-3 font-display text-[clamp(1.75rem,3.2vw,2.5rem)] font-medium tracking-tight text-ink">
        {heading}
      </h1>
      <p className="mt-3.5 text-base text-ink-soft">{description}</p>
    </>
  )
}

export { EnquiryHero, type EnquiryHeroProps }
