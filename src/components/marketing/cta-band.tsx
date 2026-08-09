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
              ? "min-[861px]:min-h-[460px] min-[861px]:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)]"
              : "items-center min-[861px]:grid-cols-[1.1fr_0.9fr]"
            : undefined
        )}
      >
        <div
          className={cn(
            isEditorial
              ? "order-2 flex h-full min-h-0 flex-col gap-8 p-8 min-[861px]:order-1 min-[861px]:gap-10 min-[861px]:p-10 min-[1024px]:p-11"
              : "grid items-center gap-[26px] p-[34px] min-[861px]:grid-cols-[1.3fr_0.7fr]"
          )}
        >
          <div className={cn("text-left", isEditorial && "max-w-[440px]")}>
            <span className="font-body text-[11.5px] font-bold uppercase tracking-[0.12em] text-[#9FD0C9]">
              {eyebrow}
            </span>
            <h3
              className={cn(
                "mt-1.5 font-display font-medium text-white",
                isEditorial
                  ? "text-[clamp(1.625rem,2.4vw,1.875rem)] leading-tight"
                  : "text-[25px]"
              )}
            >
              {title}
            </h3>
            <p
              className={cn(
                "mt-2 font-body",
                isEditorial
                  ? "text-[14px] leading-[1.7] text-[#B7C7C4]"
                  : "text-[15px] text-[#CDD9D7]"
              )}
            >
              {description}
            </p>

            {!isEditorial && features.length > 0 ? (
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

          <div
            className={cn(
              isEditorial
                ? "mt-auto flex w-full flex-col items-stretch gap-3"
                : "min-[861px]:text-right"
            )}
          >
            {isAccessStatus ? (
              <p
                className={cn(
                  "inline-flex items-center gap-1.5 font-body text-[13px] font-medium text-[#9FD0C9]",
                  !isEditorial && "min-[861px]:justify-end"
                )}
              >
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
                <div
                  className={cn(
                    "font-display text-white",
                    isEditorial ? "text-xl" : "text-2xl"
                  )}
                >
                  {price}
                </div>
                {priceNote ? (
                  <small
                    className={cn(
                      "block font-body text-[#CDD9D7]",
                      isEditorial ? "mt-0.5 text-xs" : "mt-1 text-[12.5px]"
                    )}
                  >
                    {priceNote}
                  </small>
                ) : null}
              </>
            )}
            <a
              href={action.href}
              className={cn(
                buttonVariants({ variant: "default", size: "default" }),
                "bg-white text-ink hover:bg-cream",
                isEditorial
                  ? "mt-0.5 w-full justify-center min-[861px]:w-full min-[861px]:max-w-[280px]"
                  : "mt-3.5"
              )}
            >
              {action.label}
            </a>
          </div>
        </div>

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
