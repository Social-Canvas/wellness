import "server-only"

import type { ActionResult } from "@/features/auth/services/auth.service"
import { getCurrentProfile } from "@/features/auth/services/auth.service"
import { requireStaffActor } from "@/server/auth/require-staff"
import { createAdminClient } from "@/lib/supabase/admin"
import { logger, safeErrorMessage } from "@/server/utils/logger"

import type { SiteMediaAsset } from "../types"
import {
  PRODUCT_FILES_BUCKET,
  SITE_MEDIA_BUCKET,
  buildSiteMediaPath,
  safePdfFileName,
  siteMediaPathFromPublicUrl,
  validateImageUpload,
  validateProductPdf,
} from "../validation"

export type { SiteMediaAsset }

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

async function readUpload(file: FormDataEntryValue | null): Promise<
  ActionResult<{ bytes: Uint8Array; mimeType: string; name: string }>
> {
  if (!(file instanceof File)) {
    return failure("validation_error", "Choose a file to upload.")
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  return success({
    bytes,
    mimeType: file.type,
    name: file.name,
  })
}

export async function uploadSiteMedia(formData: FormData): Promise<ActionResult<SiteMediaAsset>> {
  const actor = await requireStaffActor()
  if (!actor.success) {
    return actor
  }

  const fileResult = await readUpload(formData.get("file"))
  if (!fileResult.success) {
    return fileResult
  }

  const altText = String(formData.get("altText") ?? "").trim().slice(0, 300)
  const folder = String(formData.get("folder") ?? "content")
  const validationMessage = validateImageUpload({
    mimeType: fileResult.data.mimeType,
    sizeBytes: fileResult.data.bytes.byteLength,
  })
  if (validationMessage) {
    return failure("validation_error", validationMessage)
  }

  const storagePath = buildSiteMediaPath(folder, fileResult.data.mimeType)
  if (!storagePath) {
    return failure("validation_error", "That image could not be stored.")
  }

  try {
    const supabase = createAdminClient()
    const { error: uploadError } = await supabase.storage
      .from(SITE_MEDIA_BUCKET)
      .upload(storagePath, fileResult.data.bytes, {
        contentType: fileResult.data.mimeType,
        upsert: false,
      })

    if (uploadError) {
      logger.error("[media] image upload failed", {
        operation: "uploadSiteMedia",
        error: uploadError.message,
      })
      return failure("provider_error", "The image could not be uploaded.")
    }

    const { data: publicData } = supabase.storage.from(SITE_MEDIA_BUCKET).getPublicUrl(storagePath)
    const profile = await getCurrentProfile()
    const { data, error } = await supabase
      .from("media_assets")
      .insert({
        storage_bucket: SITE_MEDIA_BUCKET,
        storage_path: storagePath,
        public_url: publicData.publicUrl,
        alt_text: altText,
        mime_type: fileResult.data.mimeType,
        size_bytes: fileResult.data.bytes.byteLength,
        created_by: profile.success ? profile.data.id : null,
      })
      .select("id, public_url, alt_text")
      .single()

    if (error || !data) {
      await supabase.storage.from(SITE_MEDIA_BUCKET).remove([storagePath])
      logger.error("[media] image record failed", {
        operation: "uploadSiteMedia",
        error: error?.message ?? "missing row",
      })
      return failure("provider_error", "The image could not be saved.")
    }

    return success({
      id: data.id,
      publicUrl: data.public_url,
      altText: data.alt_text,
    })
  } catch (caughtError) {
    logger.error("[media] image upload unavailable", {
      operation: "uploadSiteMedia",
      error: safeErrorMessage(caughtError),
    })
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function listSiteMedia(): Promise<ActionResult<SiteMediaAsset[]>> {
  const actor = await requireStaffActor()
  if (!actor.success) {
    return actor
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("media_assets")
      .select("id, public_url, alt_text")
      .order("created_at", { ascending: false })
      .limit(24)

    if (error) {
      return failure("provider_error", "Saved images could not be loaded.")
    }

    return success(
      (data ?? []).map((row) => ({
        id: row.id,
        publicUrl: row.public_url,
        altText: row.alt_text,
      }))
    )
  } catch (caughtError) {
    logger.error("[media] list failed", {
      operation: "listSiteMedia",
      error: safeErrorMessage(caughtError),
    })
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export async function deleteSiteMediaByUrl(url: string): Promise<ActionResult<{ removed: boolean }>> {
  const actor = await requireStaffActor()
  if (!actor.success) {
    return actor
  }

  const storagePath = siteMediaPathFromPublicUrl(url)
  if (!storagePath) {
    return success({ removed: false })
  }

  try {
    const supabase = createAdminClient()
    await supabase.storage.from(SITE_MEDIA_BUCKET).remove([storagePath])
    await supabase.from("media_assets").delete().eq("storage_path", storagePath)
    return success({ removed: true })
  } catch (caughtError) {
    logger.error("[media] delete failed", {
      operation: "deleteSiteMediaByUrl",
      error: safeErrorMessage(caughtError),
    })
    return failure("unknown_error", "The previous image could not be removed.")
  }
}

export async function uploadProductPdf(input: {
  productId: string
  file: File
}): Promise<ActionResult<{ storagePath: string; fileName: string; mimeType: string; sizeBytes: number }>> {
  const actor = await requireStaffActor()
  if (!actor.success) {
    return actor
  }

  const validationMessage = validateProductPdf({
    mimeType: input.file.type,
    sizeBytes: input.file.size,
  })
  if (validationMessage) {
    return failure("validation_error", validationMessage)
  }

  const storagePath = `products/${input.productId}/${crypto.randomUUID()}.pdf`
  const bytes = new Uint8Array(await input.file.arrayBuffer())

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.storage.from(PRODUCT_FILES_BUCKET).upload(storagePath, bytes, {
      contentType: "application/pdf",
      upsert: false,
    })
    if (error) {
      logger.error("[media] pdf upload failed", {
        operation: "uploadProductPdf",
        error: error.message,
      })
      return failure("provider_error", "The PDF could not be uploaded.")
    }

    return success({
      storagePath,
      fileName: safePdfFileName(input.file.name),
      mimeType: "application/pdf",
      sizeBytes: bytes.byteLength,
    })
  } catch (caughtError) {
    logger.error("[media] pdf upload unavailable", {
      operation: "uploadProductPdf",
      error: safeErrorMessage(caughtError),
    })
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}
