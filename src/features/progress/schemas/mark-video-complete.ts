import { z } from "zod"

export const markVideoCompleteSchema = z.object({
  videoId: z.uuid("Invalid video id."),
  lessonId: z.uuid("Invalid lesson id."),
})

export type MarkVideoCompleteInput = z.infer<typeof markVideoCompleteSchema>
