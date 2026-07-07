import { z } from "zod"

export const checkoutConsentSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required."),
  email: z.email("Enter a valid email address."),
  consent: z.literal(true, {
    error: "Please confirm you agree to receive access and emails.",
  }),
  type: z.enum(["membership", "product"]),
  planSlug: z.string().trim().min(1).optional(),
  productSlug: z.string().trim().min(1).optional(),
  interval: z.enum(["monthly", "yearly"]).optional(),
})

export type CheckoutConsentInput = z.infer<typeof checkoutConsentSchema>
