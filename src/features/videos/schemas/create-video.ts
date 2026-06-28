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

export const createVideoSchema = z.object({
  title: videoTitleField,
  description: videoDescriptionField.optional().nullable(),
  durationSeconds: videoDurationSecondsField,
  thumbnailUrl: videoThumbnailUrlField.optional().nullable(),
  muxAssetId: muxAssetIdField.optional().nullable(),
  muxPlaybackId: muxPlaybackIdField.optional().nullable(),
  status: videoStatusField.optional(),
  migrationStatus: migrationStatusField.optional(),
})

export type CreateVideoInput = z.infer<typeof createVideoSchema>
