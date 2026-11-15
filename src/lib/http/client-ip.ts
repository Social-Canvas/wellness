import { headers } from "next/headers"

export async function resolveClientIp(): Promise<string> {
  const headerStore = await headers()
  const forwarded = headerStore.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) {
      return first
    }
  }
  return headerStore.get("x-real-ip")?.trim() || "unknown"
}
