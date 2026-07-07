import type { ReactNode } from "react"

import { BrandImage } from "@/components/media"
import { Container, Section } from "@/components/layout"
import type { BrandImageAsset } from "@/lib/brand/images"

type LeadPageShellProps = {
  children: ReactNode
  image?: BrandImageAsset
}

function LeadPageShell({ children, image }: LeadPageShellProps) {
  return (
    <main>
      <Section padding="default">
        <Container size="narrow">
          <div className={image ? "grid items-start gap-10 min-[861px]:grid-cols-[1fr_0.9fr]" : undefined}>
            {image ? (
              <BrandImage
                image={image}
                containerClassName="aspect-[4/5] w-full overflow-hidden rounded-2xl border border-line shadow-sm min-[861px]:sticky min-[861px]:top-24"
                sizes="(max-width: 860px) 100vw, 40vw"
              />
            ) : null}
            <div>{children}</div>
          </div>
        </Container>
      </Section>
    </main>
  )
}

export { LeadPageShell, type LeadPageShellProps }
