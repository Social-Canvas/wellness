import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border border-transparent font-body font-bold whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "rounded-[30px] bg-primary px-3.5 py-1.5 text-[12.5px] text-primary-foreground",
        secondary:
          "rounded-[30px] bg-secondary px-3.5 py-1.5 text-[12.5px] text-secondary-foreground",
        plan: "rounded-[30px] bg-green-soft px-3.5 py-1.5 text-[12.5px] text-green-deep",
        category:
          "rounded-[20px] bg-surface/85 px-2.5 py-1 text-[11px] uppercase tracking-[0.06em] text-green-deep",
        eyebrow:
          "rounded-none bg-transparent px-0 py-0 text-xs uppercase tracking-[0.18em] text-blue",
        outline:
          "rounded-[30px] border-line bg-transparent px-3.5 py-1.5 text-[12.5px] text-ink-soft",
        destructive:
          "rounded-[30px] bg-destructive/10 px-3.5 py-1.5 text-[12.5px] text-destructive",
      },
      size: {
        default: "h-auto",
        sm: "px-2 py-0.5 text-[11px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  size = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, size }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
