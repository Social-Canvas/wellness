import { z } from "zod"

import { createCourseSchema } from "./create-course"

export const updateCourseSchema = createCourseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required.",
  })

export type UpdateCourseInput = z.infer<typeof updateCourseSchema>
