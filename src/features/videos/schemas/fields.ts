import { z } from "zod"

export const videoTitleField = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(160, "Title is too long")

export const videoDescriptionField = z
  .string()
  .trim()
  .max(5000, "Description is too long")

export const videoDurationSecondsField = z
  .number()
  .int("Duration must be a whole number")
  .min(0, "Duration cannot be negative")
  .optional()
  .nullable()

export const videoThumbnailUrlField = z
  .string()
  .trim()
  .max(2048, "URL is too long")
  .refine((value) => value === "" || z.url().safeParse(value).success, {
    message: "Enter a valid URL",
  })

export const muxAssetIdField = z
  .string()
  .trim()
  .max(255, "Mux asset ID is too long")

export const muxPlaybackIdField = z
  .string()
  .trim()
  .max(255, "Mux playback ID is too long")

export const videoStatusField = z.enum(
  [
    "uploading",
    "processing",
    "ready",
    "failed",
    "draft",
    "published",
    "archived",
  ],
  { message: "Select a valid status" }
)

export const migrationStatusField = z.enum(
  ["not_started", "uploaded", "verified", "failed"],
  { message: "Select a valid migration status" }
)
