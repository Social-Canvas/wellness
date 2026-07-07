import * as React from "react"

import { BrandImage } from "@/components/media"
import { Container } from "@/components/layout/container"
import { Section } from "@/components/layout/section"
import { buttonVariants } from "@/components/ui/button"
import type { BrandImageAsset } from "@/lib/brand/images"
import { cn } from "@/lib/utils"

type CtaBandAction = {
  label: string
  href: string
}

type CtaBandProps = React.ComponentProps<"div"> & {
  eyebrow: string
  title: string
  description: string
  features?: string[]
  price: React.ReactNode
  priceNote?: string
  action: CtaBandAction
  variant?: "default" | "green"
  contained?: boolean
  image?: BrandImageAsset
}

function CtaBand({
  className,
  eyebrow,
  title,
  description,
  features = [],
  price,
  priceNote,
  action,
  variant = "default",
  contained = true,
  image,
  ...props
}: CtaBandProps) {
  const band = (
    <div
      data-slot="cta-band"
      className={cn(
        "overflow-hidden rounded-[18px] text-white",
        variant === "green" ? "bg-green-deep" : "bg-ink",
        className
      )}
      {...props}
    >
      <div className={cn("grid items-center", image ? "min-[861px]:grid-cols-[1.1fr_0.9fr]" : undefined)}>
        <div className="grid items-center gap-[26px] p-[34px] min-[861px]:grid-cols-[1.3fr_0.7fr]">
          <div className="text-left">
            <span className="font-body text-[11.5px] font-bold uppercase tracking-[0.12em] text-[#9FD0C9]">
              {eyebrow}
            </span>
            <h3 className="mt-1.5 font-display text-[25px] font-medium text-white">
              {title}
            </h3>
            <p className="mt-2 font-body text-[15px] text-[#CDD9D7]">
              {description}
            </p>

            {features.length > 0 ? (
              <ul className="mt-3 list-none columns-1 gap-5 min-[861px]:columns-2">
                {features.map((feature, index) => (
                  <li
                    key={`${feature}-${index}`}
                    className="relative py-1 pl-[18px] font-body text-[13.5px] text-[#CDD9D7]"
                  >
                    <span
                      aria-hidden
                      className="absolute top-2.5 left-0 size-[7px] rounded-full bg-[#9FD0C9]"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="min-[861px]:text-right">
            <div className="font-display text-2xl text-white">{price}</div>
            {priceNote ? (
              <small className="mt-1 block font-body text-[12.5px] text-[#CDD9D7]">
                {priceNote}
              </small>
            ) : null}
            <a
              href={action.href}
              className={cn(
                buttonVariants({ variant: "default", size: "default" }),
                "mt-3.5 bg-white text-ink hover:bg-cream"
              )}
            >
              {action.label}
            </a>
          </div>
        </div>

        {image ? (
          <BrandImage
            image={image}
            containerClassName="relative aspect-[16/10] w-full min-[861px]:min-h-full"
            sizes="40vw"
            className="opacity-90"
          />
        ) : null}
      </div>
    </div>
  )

  if (!contained) {
    return band
  }

  return (
    <Section padding="default">
      <Container>{band}</Container>
    </Section>
  )
}

export {
  CtaBand,
  type CtaBandAction,
  type CtaBandProps,
}
