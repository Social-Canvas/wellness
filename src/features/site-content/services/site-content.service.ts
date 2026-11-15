import "server-only"

import { cache } from "react"
import { unstable_cache } from "next/cache"

import { getCurrentProfile, type ActionResult } from "@/features/auth/services/auth.service"
import { requireStaffActor } from "@/server/auth/require-staff"
import { createAdminClient } from "@/lib/supabase/admin"
import { logger, safeErrorMessage } from "@/server/utils/logger"

import {
  saveSiteContentSchema,
  type SaveSiteContentInput,
} from "../schemas/save-site-content"
import { getSiteField, SITE_CONTENT_FIELDS } from "../registry"
import {
  emptySiteContent,
  mergeSiteContent,
  validateSiteContentInput,
  type SiteContentSnapshot,
  type StoredSiteContentRow,
} from "../resolve"

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

async function fetchSiteContentRows(): Promise<StoredSiteContentRow[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("site_content")
      .select("key, value, alt_text")

    if (error) {
      logger.error("[site-content] read failed", {
        operation: "fetchSiteContentRows",
        error: error.message,
      })
      return []
    }

    return data ?? []
  } catch (caughtError) {
    logger.error("[site-content] read unavailable", {
      operation: "fetchSiteContentRows",
      error: safeErrorMessage(caughtError),
    })
    return []
  }
}

const readCachedSiteContent = unstable_cache(fetchSiteContentRows, ["site-content-v1"], {
  tags: ["site-content"],
  revalidate: 300,
})

export const loadSiteContent = cache(async (): Promise<SiteContentSnapshot> => {
  try {
    const rows = await readCachedSiteContent()
    return mergeSiteContent(rows)
  } catch (caughtError) {
    logger.error("[site-content] cache read failed", {
      operation: "loadSiteContent",
      error: safeErrorMessage(caughtError),
    })
    return emptySiteContent()
  }
})

export async function saveSiteContent(
  input: SaveSiteContentInput
): Promise<ActionResult<{ updated: number }>> {
  const actor = await requireStaffActor()
  if (!actor.success) {
    return actor
  }

  const parsed = saveSiteContentSchema.safeParse(input)
  if (!parsed.success) {
    return failure("validation_error", "Check the content fields and try again.")
  }

  const validationMessage = validateSiteContentInput(
    parsed.data.fields.map((field) => ({
      key: field.key,
      value: field.value,
      altText: field.altText,
    }))
  )
  if (validationMessage) {
    return failure("validation_error", validationMessage)
  }

  const profile = await getCurrentProfile()
  const updatedBy = profile.success ? profile.data.id : null
  const rows = parsed.data.fields.map((field) => {
    const definition = getSiteField(field.key)
    return {
      key: field.key,
      group_key: definition?.group ?? "global",
      label: definition?.label ?? field.key,
      help_text: definition?.help ?? null,
      field_type: definition?.type ?? "text",
      value: field.value,
      alt_text: field.altText?.trim() ?? "",
      sort_order: definition?.sort ?? 0,
      updated_by: updatedBy,
    }
  })

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" })
    if (error) {
      logger.error("[site-content] save failed", {
        operation: "saveSiteContent",
        error: error.message,
      })
      return failure(
        "provider_error",
        "Content could not be saved. Apply the latest database migration, then try again."
      )
    }

    return success({ updated: rows.length })
  } catch (caughtError) {
    logger.error("[site-content] save unavailable", {
      operation: "saveSiteContent",
      error: safeErrorMessage(caughtError),
    })
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}

export function listEditableSiteFields() {
  return SITE_CONTENT_FIELDS
}
