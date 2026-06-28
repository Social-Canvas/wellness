import { z } from "zod"

export const getVideoProgressSchema = z.object({
  videoId: z.uuid("Invalid video id."),
})

export type GetVideoProgressInput = z.infer<typeof getVideoProgressSchema>
