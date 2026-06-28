import { z } from "zod"

import {
  migrationStatusField,
  muxAssetIdField,
  muxPlaybackIdField,
  videoDescriptionField,
  videoDurationSecondsField,
  videoStatusField,
  videoThumbnailUrlField,
  videoTitleField,
} from "./fields"

export const updateVideoSchema = z.object({
  title: videoTitleField.optional(),
  description: videoDescriptionField.optional().nullable(),
  durationSeconds: videoDurationSecondsField,
  thumbnailUrl: videoThumbnailUrlField.optional().nullable(),
  muxAssetId: muxAssetIdField.optional().nullable(),
  muxPlaybackId: muxPlaybackIdField.optional().nullable(),
  status: videoStatusField.optional(),
  migrationStatus: migrationStatusField.optional(),
})

export type UpdateVideoInput = z.infer<typeof updateVideoSchema>
