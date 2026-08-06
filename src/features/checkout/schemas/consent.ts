import { z } from "zod"

export const checkoutConsentSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required."),
  email: z.email("Enter a valid email address."),
  /** Optional marketing opt-in — never required for purchase or course access. */
  marketingOptIn: z.boolean().optional().default(false),
  type: z.enum(["membership", "product"]),
  planSlug: z.string().trim().min(1).optional(),
  productSlug: z.string().trim().min(1).optional(),
  interval: z.enum(["monthly", "yearly"]).optional(),
})

export type CheckoutConsentInput = z.infer<typeof checkoutConsentSchema>
