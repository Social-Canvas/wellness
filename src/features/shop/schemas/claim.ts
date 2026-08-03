import { z } from "zod"

export const claimFreeDigitalProductSchema = z.object({
  productSlug: z
    .string()
    .trim()
    .min(1, "Product slug is required.")
    .max(80, "Product slug is too long.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Product slug must use lowercase letters, numbers, and hyphens."
    ),
})

export type ClaimFreeDigitalProductInput = z.infer<
  typeof claimFreeDigitalProductSchema
>
