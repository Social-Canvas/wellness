import { z } from "zod"

import {
  recordedSessionDisplayOrderField,
  recordedSessionDurationSecondsField,
  recordedSessionFocusField,
  recordedSessionMuxAssetIdField,
  recordedSessionMuxPlaybackIdField,
  recordedSessionPresenterField,
  recordedSessionProcessingStatusField,
  recordedSessionPublicationStatusField,
  recordedSessionShortDescriptionField,
  recordedSessionSlugField,
  recordedSessionThemeField,
  recordedSessionThumbnailUrlField,
  recordedSessionTitleField,
  recordedSessionTopicField,
  recordedSessionWeekNumberField,
} from "./fields"

const optionalTrimmed = <T extends z.ZodType>(schema: T) =>
  z.union([schema, z.literal("")]).optional().nullable()

export const createRecordedSessionSchema = z.object({
  title: recordedSessionTitleField,
  slug: recordedSessionSlugField,
  shortDescription: optionalTrimmed(recordedSessionShortDescriptionField),
  recordedAt: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    ])
    .optional()
    .nullable(),
  durationSeconds: recordedSessionDurationSecondsField,
  presenter: optionalTrimmed(recordedSessionPresenterField),
  monthlyTheme: optionalTrimmed(recordedSessionThemeField),
  weekNumber: recordedSessionWeekNumberField,
  weeklyTopic: optionalTrimmed(recordedSessionTopicField),
  focus: recordedSessionFocusField.optional().nullable(),
  thumbnailUrl: optionalTrimmed(recordedSessionThumbnailUrlField),
  muxAssetId: optionalTrimmed(recordedSessionMuxAssetIdField),
  muxPlaybackId: optionalTrimmed(recordedSessionMuxPlaybackIdField),
  processingStatus: recordedSessionProcessingStatusField.optional(),
  publicationStatus: recordedSessionPublicationStatusField.optional(),
  displayOrder: recordedSessionDisplayOrderField,
})

export type CreateRecordedSessionInput = z.infer<
  typeof createRecordedSessionSchema
>

export const updateRecordedSessionSchema = createRecordedSessionSchema
  .partial()
  .extend({
    publishedAt: z.string().datetime().optional().nullable(),
  })

export type UpdateRecordedSessionInput = z.infer<
  typeof updateRecordedSessionSchema
>
