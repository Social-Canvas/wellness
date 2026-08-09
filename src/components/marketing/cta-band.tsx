import * as React from "react"
import { Check } from "lucide-react"

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
  /**
   * `default`: features + side-by-side price/CTA (VIP, retreats).
   * `editorial`: single content column, image-forward Reset Plan card.
   */
  layout?: "default" | "editorial"
  /** Soft status treatment for entitled Access active / Purchased states. */
  statusVariant?: "price" | "access"
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
  layout = "default",
  statusVariant = "price",
  ...props
}: CtaBandProps) {
  const isEditorial = layout === "editorial"
  const isAccessStatus = statusVariant === "access"
  const showAccessCheck =
    isAccessStatus && typeof price === "string" && price === "Access active"

  const editorialStatusBlock = isAccessStatus ? (
    <p className="mt-10 inline-flex items-center gap-1.5 font-body text-base font-medium text-[#9FD0C9]">
      {showAccessCheck ? (
        <Check aria-hidden className="size-3.5 shrink-0 stroke-[2.5]" />
      ) : null}
      <span>{price}</span>
    </p>
  ) : (
    <>
      <div className="mt-10 font-display text-[2.125rem] font-semibold leading-none text-white min-[768px]:text-[2.375rem] min-[1024px]:text-[2.5rem]">
        {price}
      </div>
      {priceNote ? (
        <small className="mt-2.5 block font-body text-base font-normal leading-snug text-[#B7C7C4] min-[861px]:text-lg">
          {priceNote}
        </small>
      ) : null}
    </>
  )

  const band = (
    <div
      data-slot="cta-band"
      data-layout={layout}
      className={cn(
        "overflow-hidden rounded-[18px] text-white",
        variant === "green" ? "bg-green-deep" : "bg-ink",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "grid",
          image
            ? isEditorial
              ? "min-[861px]:min-h-[400px] min-[861px]:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)]"
              : "items-center min-[861px]:grid-cols-[1.1fr_0.9fr]"
            : undefined
        )}
      >
        {isEditorial ? (
          <div className="order-2 flex h-full min-h-0 flex-col justify-center px-8 py-8 min-[768px]:px-11 min-[768px]:py-11 min-[861px]:order-1 min-[1024px]:px-14 min-[1024px]:py-14">
            <div className="flex w-full max-w-[440px] flex-col items-stretch text-left">
              <span className="font-body text-[11.5px] font-bold uppercase tracking-[0.12em] text-[#9FD0C9]">
                {eyebrow}
              </span>
              <h3 className="mt-3.5 font-display text-[clamp(1.625rem,2.4vw,1.875rem)] font-medium leading-tight text-white">
                {title}
              </h3>
              <p className="mt-5 font-body text-[14px] leading-[1.7] text-[#B7C7C4]">
                {description}
              </p>

              {editorialStatusBlock}

              <a
                href={action.href}
                className={cn(
                  buttonVariants({ variant: "default", size: "default" }),
                  "mt-6 w-full max-w-none justify-center bg-white text-ink hover:bg-cream min-[861px]:w-full min-[861px]:max-w-[300px]"
                )}
              >
                {action.label}
              </a>
            </div>
          </div>
        ) : (
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
              {isAccessStatus ? (
                <p className="inline-flex items-center gap-1.5 font-body text-[13px] font-medium text-[#9FD0C9] min-[861px]:justify-end">
                  {showAccessCheck ? (
                    <Check
                      aria-hidden
                      className="size-3.5 shrink-0 stroke-[2.5]"
                    />
                  ) : null}
                  <span>{price}</span>
                </p>
              ) : (
                <>
                  <div className="font-display text-2xl text-white">{price}</div>
                  {priceNote ? (
                    <small className="mt-1 block font-body text-[12.5px] text-[#CDD9D7]">
                      {priceNote}
                    </small>
                  ) : null}
                </>
              )}
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
        )}

        {image ? (
          <BrandImage
            image={image}
            containerClassName={cn(
              "relative w-full",
              isEditorial
                ? "order-1 aspect-[16/10] min-[861px]:order-2 min-[861px]:aspect-auto min-[861px]:min-h-full"
                : "aspect-[16/10] min-[861px]:min-h-full"
            )}
            sizes={
              isEditorial
                ? "(max-width: 860px) 100vw, 55vw"
                : "40vw"
            }
            className={isEditorial ? "opacity-100" : "opacity-90"}
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
