import { z } from "zod"

import { createModuleSchema } from "./create-module"

export const updateModuleSchema = createModuleSchema
  .omit({ slug: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required.",
  })

export type UpdateModuleInput = z.infer<typeof updateModuleSchema>
