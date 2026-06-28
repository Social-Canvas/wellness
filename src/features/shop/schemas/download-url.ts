import { z } from "zod"

export const generateProductDownloadUrlSchema = z.object({
  productId: z.uuid("Invalid product id."),
  fileId: z.uuid("Invalid file id.").optional(),
})

export type GenerateProductDownloadUrlInput = z.infer<
  typeof generateProductDownloadUrlSchema
>
