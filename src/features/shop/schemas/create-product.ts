import { z } from "zod"

import {
  coverImageUrlField,
  currencyField,
  priceAmountField,
  productDescriptionField,
  productSlugField,
  productTitleField,
  productTypeField,
  publishStatusField,
  stripePriceIdField,
} from "./fields"

export const createProductSchema = z.object({
  title: productTitleField,
  slug: productSlugField,
  description: productDescriptionField.optional().nullable(),
  productType: productTypeField,
  priceAmount: priceAmountField,
  currency: currencyField.optional(),
  stripePriceId: stripePriceIdField,
  coverImageUrl: coverImageUrlField.optional().nullable(),
  status: publishStatusField.optional(),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
