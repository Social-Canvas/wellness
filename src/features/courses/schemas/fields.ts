import { z } from "zod"

export const courseSlugField = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(80, "Slug is too long")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must use lowercase letters, numbers, and hyphens"
  )

export const courseTitleField = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(160, "Title is too long")

export const courseDescriptionField = z
  .string()
  .trim()
  .max(5000, "Description is too long")

export const courseThumbnailUrlField = z
  .string()
  .trim()
  .max(2048, "URL is too long")
  .refine((value) => value === "" || z.url().safeParse(value).success, {
    message: "Enter a valid URL",
  })

export const publishStatusField = z.enum(["draft", "published", "archived"], {
  message: "Select a valid status",
})

export const completionThresholdField = z
  .number()
  .int("Completion threshold must be a whole number")
  .min(1, "Completion threshold must be at least 1%")
  .max(100, "Completion threshold cannot exceed 100%")

export const publishedAtField = z
  .string()
  .trim()
  .optional()
  .nullable()
