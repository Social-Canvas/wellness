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

export const updateProductSchema = z.object({
  title: productTitleField.optional(),
  slug: productSlugField.optional(),
  description: productDescriptionField.optional().nullable(),
  productType: productTypeField.optional(),
  priceAmount: priceAmountField.optional(),
  currency: currencyField.optional(),
  stripePriceId: stripePriceIdField,
  coverImageUrl: coverImageUrlField.optional().nullable(),
  status: publishStatusField.optional(),
})

export type UpdateProductInput = z.infer<typeof updateProductSchema>
