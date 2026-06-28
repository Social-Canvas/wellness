import { z } from "zod"

import {
  fileNameField,
  mimeTypeField,
  sizeBytesField,
  storageBucketField,
  storagePathField,
} from "./fields"

export const upsertProductFileSchema = z.object({
  productId: z.uuid("Invalid product id."),
  fileName: fileNameField,
  storageBucket: storageBucketField,
  storagePath: storagePathField,
  mimeType: mimeTypeField,
  sizeBytes: sizeBytesField,
})

export type UpsertProductFileInput = z.infer<typeof upsertProductFileSchema>

export const deleteProductFileSchema = z.object({
  fileId: z.uuid("Invalid file id."),
})

export type DeleteProductFileInput = z.infer<typeof deleteProductFileSchema>
