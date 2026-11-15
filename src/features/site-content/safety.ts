const EM_DASH = "\u2014"

const SOCIAL_HOSTS: Record<string, readonly string[]> = {
  "global.social.instagram": ["instagram.com", "www.instagram.com"],
  "global.social.facebook": ["facebook.com", "www.facebook.com", "m.facebook.com"],
  "global.social.linkedin": ["linkedin.com", "www.linkedin.com"],
  "global.social.facebook_group": ["facebook.com", "www.facebook.com", "m.facebook.com"],
}

export function containsEmDash(value: string): boolean {
  return value.includes(EM_DASH)
}

export function isSafeInternalHref(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed.startsWith("/")) {
    return trimmed.startsWith("#") && !trimmed.startsWith("#//") && trimmed.length > 1
  }
  if (trimmed.startsWith("//") || trimmed.includes("\\") || trimmed.includes("..")) {
    return false
  }
  return !/[\s<>"]/.test(trimmed)
}

export function isSafeSocialUrl(key: string, value: string): boolean {
  const hosts = SOCIAL_HOSTS[key]
  if (!hosts) {
    return isSafeInternalHref(value)
  }

  try {
    const url = new URL(value.trim())
    return url.protocol === "https:" && hosts.includes(url.hostname)
  } catch {
    return false
  }
}

export function isSafeImageValue(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) {
    return true
  }
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("..")) {
    return !/[\s<>"]/.test(trimmed)
  }

  try {
    const url = new URL(trimmed)
    return (
      url.protocol === "https:" &&
      url.pathname.includes("/storage/v1/object/public/site-media/")
    )
  } catch {
    return false
  }
}
