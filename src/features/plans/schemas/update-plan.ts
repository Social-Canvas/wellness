import { z } from "zod"

import { createPlanSchema } from "./create-plan"

export const updatePlanSchema = createPlanSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required.",
  })

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>
