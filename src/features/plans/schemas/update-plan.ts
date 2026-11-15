import { z } from "zod"

import { createPlanSchema } from "./create-plan"

export const updatePlanSchema = createPlanSchema
  .omit({ slug: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required.",
  })

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>
