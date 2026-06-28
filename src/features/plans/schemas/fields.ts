import { z } from "zod"

export const planSlugField = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(80, "Slug is too long")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must use lowercase letters, numbers, and hyphens"
  )

export const planNameField = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(120, "Name is too long")

export const planDescriptionField = z
  .string()
  .trim()
  .max(2000, "Description is too long")
