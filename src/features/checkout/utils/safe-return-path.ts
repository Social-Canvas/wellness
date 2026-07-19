/**
 * Allow only same-origin relative paths. Blocks protocol-relative and absolute URLs.
 */
export function isSafeRelativePath(path: string | null | undefined): path is string {
  if (!path) {
    return false
  }

  if (!path.startsWith("/")) {
    return false
  }

  if (path.startsWith("//")) {
    return false
  }

  if (path.includes("://")) {
    return false
  }

  if (path.includes("\\")) {
    return false
  }

  return true
}

export function sanitizeReturnPath(
  path: string | null | undefined,
  fallback: string
): string {
  if (!isSafeRelativePath(path)) {
    return fallback
  }

  return path
}
