export const SITE_MEDIA_BUCKET = "site-media"
export const PRODUCT_FILES_BUCKET = "product-files"
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const PRODUCT_FILE_MAX_BYTES = 50 * 1024 * 1024

const IMAGE_MIME_EXTENSION = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const

export type ImageMimeType = keyof typeof IMAGE_MIME_EXTENSION

export function imageExtension(mimeType: string): string | null {
  if (mimeType in IMAGE_MIME_EXTENSION) {
    return IMAGE_MIME_EXTENSION[mimeType as ImageMimeType]
  }
  return null
}

export function validateImageUpload(input: {
  mimeType: string
  sizeBytes: number
}): string | null {
  if (!imageExtension(input.mimeType)) {
    return "Upload a JPEG, PNG, WebP, or GIF image."
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return "That image is empty."
  }
  if (input.sizeBytes > IMAGE_MAX_BYTES) {
    return "Images must be 5 MB or smaller."
  }
  return null
}

export function validateProductPdf(input: {
  mimeType: string
  sizeBytes: number
}): string | null {
  if (input.mimeType !== "application/pdf") {
    return "Upload a PDF file."
  }
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    return "That PDF is empty."
  }
  if (input.sizeBytes > PRODUCT_FILE_MAX_BYTES) {
    return "PDFs must be 50 MB or smaller."
  }
  return null
}

export function buildSiteMediaPath(folder: string, mimeType: string): string | null {
  const extension = imageExtension(mimeType)
  if (!extension || !/^[a-z0-9-]{1,40}$/.test(folder)) {
    return null
  }
  return `${folder}/${crypto.randomUUID()}.${extension}`
}

export function siteMediaPathFromPublicUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    const marker = `/storage/v1/object/public/${SITE_MEDIA_BUCKET}/`
    const index = parsed.pathname.indexOf(marker)
    if (index < 0) {
      return null
    }
    const path = decodeURIComponent(parsed.pathname.slice(index + marker.length))
    if (!path || path.includes("..") || path.startsWith("/")) {
      return null
    }
    return path
  } catch {
    return null
  }
}

export function safePdfFileName(fileName: string): string {
  const base = fileName
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
  return `${base || "download"}.pdf`
}
