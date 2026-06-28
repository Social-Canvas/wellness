import { z } from "zod"

import {
  completionThresholdField,
  courseDescriptionField,
  courseSlugField,
  courseThumbnailUrlField,
  courseTitleField,
  publishedAtField,
  publishStatusField,
} from "./fields"

export const createCourseSchema = z.object({
  title: courseTitleField,
  slug: courseSlugField,
  description: courseDescriptionField.optional().nullable(),
  thumbnailUrl: courseThumbnailUrlField.optional().nullable(),
  certificateEnabled: z.boolean().optional(),
  completionThreshold: completionThresholdField.optional(),
  sortOrder: z.number().int().min(0, "Sort order cannot be negative").optional(),
  status: publishStatusField.optional(),
  publishedAt: publishedAtField,
})

export type CreateCourseInput = z.infer<typeof createCourseSchema>
