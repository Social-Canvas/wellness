import { z } from "zod"

import {
  lessonDescriptionField,
  lessonSlugField,
  lessonTitleField,
  publishStatusField,
} from "./fields"

export const createLessonSchema = z.object({
  title: lessonTitleField,
  slug: lessonSlugField,
  description: lessonDescriptionField.optional().nullable(),
  sortOrder: z.number().int().min(0, "Sort order cannot be negative").optional(),
  isRequired: z.boolean().optional(),
  status: publishStatusField.optional(),
})

export type CreateLessonInput = z.infer<typeof createLessonSchema>
