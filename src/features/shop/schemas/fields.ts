import { z } from "zod"

export const productSlugField = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(80, "Slug is too long")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must use lowercase letters, numbers, and hyphens"
  )

export const productTitleField = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(160, "Title is too long")

export const productDescriptionField = z
  .string()
  .trim()
  .max(5000, "Description is too long")

export const productTypeField = z.enum(
  ["ebook", "digital_download", "bundle", "masterclass", "session"],
  { message: "Select a valid product type" }
)

export const publishStatusField = z.enum(["draft", "published", "archived"], {
  message: "Select a valid status",
})

export const priceAmountField = z
  .number()
  .int("Price must be a whole number of cents")
  .min(1, "Price must be greater than zero")

export const currencyField = z
  .string()
  .trim()
  .min(3, "Currency is required")
  .max(3, "Use a 3-letter currency code")
  .transform((value) => value.toLowerCase())

export const stripePriceIdField = z
  .string()
  .trim()
  .max(255, "Stripe price ID is too long")
  .optional()
  .nullable()

export const coverImageUrlField = z
  .string()
  .trim()
  .max(2048, "URL is too long")
  .refine((value) => value === "" || z.url().safeParse(value).success, {
    message: "Enter a valid URL",
  })

export const storageBucketField = z
  .string()
  .trim()
  .min(1, "Storage bucket is required")
  .max(120, "Storage bucket is too long")

export const storagePathField = z
  .string()
  .trim()
  .min(1, "Storage path is required")
  .max(2048, "Storage path is too long")

export const fileNameField = z
  .string()
  .trim()
  .min(1, "File name is required")
  .max(255, "File name is too long")

export const mimeTypeField = z
  .string()
  .trim()
  .max(120, "MIME type is too long")
  .optional()
  .nullable()

export const sizeBytesField = z
  .number()
  .int("File size must be a whole number")
  .min(0, "File size cannot be negative")
  .optional()
  .nullable()
