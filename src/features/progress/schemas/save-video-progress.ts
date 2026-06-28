import { z } from "zod"

export const saveVideoProgressSchema = z.object({
  videoId: z.uuid("Invalid video id."),
  lessonId: z.uuid("Invalid lesson id."),
  positionSeconds: z.number().int().min(0, "Position must be zero or greater."),
  durationSeconds: z.number().min(0, "Duration must be zero or greater."),
})

export type SaveVideoProgressInput = z.infer<typeof saveVideoProgressSchema>
