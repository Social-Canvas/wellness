import { z } from "zod"

export const calculateCourseProgressSchema = z.object({
  courseId: z.uuid("Invalid course id."),
})

export type CalculateCourseProgressInput = z.infer<typeof calculateCourseProgressSchema>
