"use server"

import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/features/auth/services/auth.service"
import type { CreateVideoInput, UpdateVideoInput } from "@/features/videos/schemas"
import {
  archiveVideo,
  createVideo,
  updateVideo,
} from "@/features/videos/services/videos.service"
import type { Video } from "@/features/videos/types"

function revalidateVideosPath() {
  revalidatePath("/admin/videos")
}

export async function createVideoAction(
  input: CreateVideoInput
): Promise<ActionResult<Video>> {
  const result = await createVideo(input)

  if (!result.success) {
    return result
  }

  revalidateVideosPath()
  return result
}

export async function updateVideoAction(
  id: string,
  input: UpdateVideoInput
): Promise<ActionResult<Video>> {
  const result = await updateVideo(id, input)

  if (!result.success) {
    return result
  }

  revalidateVideosPath()
  return result
}

export async function archiveVideoAction(
  id: string
): Promise<ActionResult<Video>> {
  const result = await archiveVideo(id)

  if (!result.success) {
    return result
  }

  revalidateVideosPath()
  return result
}
