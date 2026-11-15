"use server"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  deleteSiteMediaByUrl,
  listSiteMedia,
  uploadSiteMedia,
} from "@/features/media/services/media.service"
import type { SiteMediaAsset } from "@/features/media/types"

export async function uploadSiteMediaAction(
  formData: FormData
): Promise<ActionResult<SiteMediaAsset>> {
  return uploadSiteMedia(formData)
}

export async function listSiteMediaAction(): Promise<ActionResult<SiteMediaAsset[]>> {
  return listSiteMedia()
}

export async function deleteSiteMediaByUrlAction(
  url: string
): Promise<ActionResult<{ removed: boolean }>> {
  return deleteSiteMediaByUrl(url)
}
