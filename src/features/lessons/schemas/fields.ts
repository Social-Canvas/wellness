import { z } from "zod"

export const lessonSlugField = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(80, "Slug is too long")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must use lowercase letters, numbers, and hyphens"
  )

export const lessonTitleField = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(160, "Title is too long")

export const lessonDescriptionField = z
  .string()
  .trim()
  .max(5000, "Description is too long")

export const publishStatusField = z.enum(["draft", "published", "archived"], {
  message: "Select a valid status",
})

export const lessonVideoIdField = z
  .union([z.uuid("Select a valid video."), z.literal(""), z.null()])
  .optional()
