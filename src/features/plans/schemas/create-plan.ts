import { z } from "zod"

import { planDescriptionField, planNameField, planSlugField } from "./fields"

export const createPlanSchema = z.object({
  name: planNameField,
  slug: planSlugField,
  description: planDescriptionField.optional().nullable(),
  sortOrder: z.number().int().min(0, "Sort order cannot be negative").optional(),
  isActive: z.boolean().optional(),
})

export type CreatePlanInput = z.infer<typeof createPlanSchema>
