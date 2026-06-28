import { z } from "zod"

export const moduleSlugField = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(80, "Slug is too long")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must use lowercase letters, numbers, and hyphens"
  )

export const moduleTitleField = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(160, "Title is too long")

export const moduleDescriptionField = z
  .string()
  .trim()
  .max(5000, "Description is too long")

export const publishStatusField = z.enum(["draft", "published", "archived"], {
  message: "Select a valid status",
})
