"use server"

import { revalidatePath, updateTag } from "next/cache"

import type { ActionResult } from "@/features/auth/services/auth.service"
import { saveSiteContent } from "@/features/site-content/services/site-content.service"
import type { SaveSiteContentInput } from "@/features/site-content/schemas/save-site-content"

const PUBLIC_PATHS = ["/", "/about", "/programs", "/retreats", "/nonprofits", "/shop"]

export async function saveSiteContentAction(
  input: SaveSiteContentInput
): Promise<ActionResult<{ updated: number }>> {
  const result = await saveSiteContent(input)
  if (!result.success) {
    return result
  }

  updateTag("site-content")
  for (const path of PUBLIC_PATHS) {
    revalidatePath(path)
  }
  revalidatePath("/admin/content")
  return result
}
