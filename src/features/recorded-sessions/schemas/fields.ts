import { z } from "zod"

export const RECORDED_SESSION_FOCUS_VALUES = [
  "awareness",
  "release",
  "embodiment",
  "integration",
] as const

export const recordedSessionFocusField = z.enum(RECORDED_SESSION_FOCUS_VALUES)

export const recordedSessionTitleField = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(160, "Title is too long")

export const recordedSessionSlugField = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(120, "Slug is too long")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must be lowercase letters, numbers, and hyphens"
  )

export const recordedSessionShortDescriptionField = z
  .string()
  .trim()
  .max(500, "Description is too long")

export const recordedSessionPresenterField = z
  .string()
  .trim()
  .max(120, "Presenter name is too long")

export const recordedSessionThemeField = z
  .string()
  .trim()
  .max(120, "Theme is too long")

export const recordedSessionTopicField = z
  .string()
  .trim()
  .max(160, "Topic is too long")

export const recordedSessionWeekNumberField = z
  .number()
  .int("Week must be a whole number")
  .min(1, "Week must be at least 1")
  .max(52, "Week must be 52 or less")
  .optional()
  .nullable()

export const recordedSessionDurationSecondsField = z
  .number()
  .int("Duration must be a whole number")
  .min(0, "Duration cannot be negative")
  .optional()
  .nullable()

export const recordedSessionThumbnailUrlField = z
  .string()
  .trim()
  .max(2048, "URL is too long")
  .refine((value) => value === "" || z.url().safeParse(value).success, {
    message: "Enter a valid URL",
  })

export const recordedSessionMuxAssetIdField = z
  .string()
  .trim()
  .max(255, "Mux asset ID is too long")

export const recordedSessionMuxPlaybackIdField = z
  .string()
  .trim()
  .max(255, "Mux playback ID is too long")

export const recordedSessionPublicationStatusField = z.enum([
  "draft",
  "published",
  "archived",
])

export const recordedSessionProcessingStatusField = z.enum([
  "uploading",
  "processing",
  "ready",
  "failed",
  "draft",
  "published",
  "archived",
])

export const recordedSessionDisplayOrderField = z
  .number()
  .int("Display order must be a whole number")
  .min(0, "Display order cannot be negative")
  .optional()
