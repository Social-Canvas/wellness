import { BrandImage } from "@/components/media"
import { buttonVariants } from "@/components/ui/button"
import type { BrandImageAsset } from "@/lib/brand/images"
import { cn } from "@/lib/utils"

/**
 * Vertical enquiry cards (VIP / Retreats).
 * Eyebrow and description scales match the prior Retreat editorial baseline;
 * heading is intentionally smaller for a calmer hierarchy.
 */
type FeatureEnquiryCardProps = {
  eyebrow: string
  title: string
  description: string
  supportingText?: string
  action: { label: string; href: string }
  image: BrandImageAsset
  variant?: "default" | "green"
  className?: string
}

function FeatureEnquiryCard({
  eyebrow,
  title,
  description,
  supportingText,
  action,
  image,
  variant = "default",
  className,
}: FeatureEnquiryCardProps) {
  return (
    <article
      data-slot="feature-enquiry-card"
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[18px] text-white",
        variant === "green" ? "bg-green-deep" : "bg-ink",
        className
      )}
    >
      <BrandImage
        image={image}
        containerClassName="relative aspect-[4/3] w-full shrink-0"
        sizes="(max-width: 1023px) 100vw, 50vw"
        className="opacity-100"
      />

      <div className="flex flex-1 flex-col px-8 py-8 min-[768px]:px-11 min-[768px]:py-11 min-[1024px]:px-10 min-[1024px]:py-10 min-[1280px]:px-11 min-[1280px]:py-11">
        <span className="font-body text-[11.5px] font-bold uppercase tracking-[0.12em] text-[#9FD0C9]">
          {eyebrow}
        </span>
        <h3 className="mt-3 font-display text-[clamp(1.25rem,1.8vw,1.5rem)] font-medium leading-snug text-white">
          {title}
        </h3>
        <p className="mt-4 font-body text-[14px] leading-[1.7] text-[#B7C7C4]">
          {description}
        </p>

        {supportingText ? (
          <p className="mt-5 font-body text-base font-normal leading-snug text-[#B7C7C4] min-[861px]:text-lg">
            {supportingText}
          </p>
        ) : null}

        <div className="mt-auto pt-6">
          <a
            href={action.href}
            className={cn(
              buttonVariants({ variant: "default", size: "default" }),
              "w-full max-w-none justify-center bg-white text-ink hover:bg-cream"
            )}
          >
            {action.label}
          </a>
        </div>
      </div>
    </article>
  )
}

export {
  FeatureEnquiryCard,
  type FeatureEnquiryCardProps,
}
