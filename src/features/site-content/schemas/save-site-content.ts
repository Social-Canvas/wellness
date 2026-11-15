import { z } from "zod"

export const siteContentFieldSchema = z.object({
  key: z.string().trim().min(1).max(120),
  value: z.string().max(4000),
  altText: z.string().max(300).optional(),
})

export const saveSiteContentSchema = z.object({
  fields: z.array(siteContentFieldSchema).min(1).max(200),
})

export type SaveSiteContentInput = z.infer<typeof saveSiteContentSchema>
