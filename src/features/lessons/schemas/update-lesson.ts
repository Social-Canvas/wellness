import { z } from "zod"

import { createLessonSchema } from "./create-lesson"

export const updateLessonSchema = createLessonSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required.",
  })

export type UpdateLessonInput = z.infer<typeof updateLessonSchema>
