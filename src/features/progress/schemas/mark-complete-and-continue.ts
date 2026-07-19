import { z } from "zod"

export const markCompleteAndContinueSchema = z.object({
  courseId: z.uuid("Invalid course id."),
  lessonId: z.uuid("Invalid lesson id."),
  videoId: z.uuid("Invalid video id."),
  preview: z.enum(["0", "1"]).optional(),
})

export type MarkCompleteAndContinueInput = z.infer<
  typeof markCompleteAndContinueSchema
>
