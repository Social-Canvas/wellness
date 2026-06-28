import { z } from "zod"

import {
  moduleDescriptionField,
  moduleSlugField,
  moduleTitleField,
  publishStatusField,
} from "./fields"

export const createModuleSchema = z.object({
  title: moduleTitleField,
  slug: moduleSlugField,
  description: moduleDescriptionField.optional().nullable(),
  sortOrder: z.number().int().min(0, "Sort order cannot be negative").optional(),
  status: publishStatusField.optional(),
})

export type CreateModuleInput = z.infer<typeof createModuleSchema>
