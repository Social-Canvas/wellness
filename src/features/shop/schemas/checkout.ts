import { z } from "zod"

export const createProductCheckoutSchema = z.object({
  productId: z.uuid("Invalid product id."),
})

export type CreateProductCheckoutInput = z.infer<typeof createProductCheckoutSchema>
