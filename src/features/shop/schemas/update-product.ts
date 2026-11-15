import { z } from "zod"

import {
  coverImageUrlField,
  productDescriptionField,
  productTitleField,
  publishStatusField,
} from "./fields"

export const updateProductSchema = z.object({
  title: productTitleField.optional(),
  description: productDescriptionField.optional().nullable(),
  coverImageUrl: coverImageUrlField.optional().nullable(),
  status: publishStatusField.optional(),
})

export type UpdateProductInput = z.infer<typeof updateProductSchema>
