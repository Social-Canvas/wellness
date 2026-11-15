import { ELEVATE_MEMBERSHIPS } from "@/lib/constants/elevate-brand"
import type { HomepageVideoTestimonial } from "@/features/marketing-testimonials/types"

import { getSiteField, SITE_CONTENT_FIELDS, type SiteField } from "./registry"
import {
  containsEmDash,
  isSafeImageValue,
  isSafeInternalHref,
  isSafeSocialUrl,
} from "./safety"

export { isSafeImageValue, isSafeInternalHref, isSafeSocialUrl }

export type SiteContentSnapshot = {
  values: Record<string, string>
  alts: Record<string, string>
}

export type StoredSiteContentRow = {
  key: string
  value: string
  alt_text?: string | null
}

export function emptySiteContent(): SiteContentSnapshot {
  return { values: {}, alts: {} }
}

export function mergeSiteContent(rows: readonly StoredSiteContentRow[]): SiteContentSnapshot {
  const values: Record<string, string> = {}
  const alts: Record<string, string> = {}

  for (const row of rows) {
    if (!getSiteField(row.key)) {
      continue
    }
    values[row.key] = row.value ?? ""
    alts[row.key] = row.alt_text?.trim() ?? ""
  }

  return { values, alts }
}

export function readSiteText(
  snapshot: SiteContentSnapshot,
  key: string,
  fallback?: string
): string {
  const definition = getSiteField(key)
  const stored = snapshot.values[key]
  const resolvedFallback = fallback ?? definition?.defaultValue ?? ""
  if (stored === undefined || stored.trim() === "") {
    return resolvedFallback
  }
  return stored
}

export function readSiteAlt(snapshot: SiteContentSnapshot, key: string): string {
  const stored = snapshot.alts[key]?.trim()
  if (stored) {
    return stored
  }
  return getSiteField(key)?.defaultAlt ?? ""
}

export function readSiteLines(snapshot: SiteContentSnapshot, key: string): string[] {
  return readSiteText(snapshot, key)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

export function readSiteParagraphs(snapshot: SiteContentSnapshot, key: string): string[] {
  return readSiteText(snapshot, key)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
}

export function validateSiteField(
  definition: SiteField,
  value: string,
  altText: string
): string | null {
  const trimmed = value.trim()
  if (definition.required && trimmed.length === 0) {
    return `${definition.label} is required.`
  }
  if (containsEmDash(value) || containsEmDash(altText)) {
    return `${definition.label} cannot use an em dash.`
  }
  if (/javascript:/i.test(value) || /<\s*script/i.test(value)) {
    return `${definition.label} contains an unsupported value.`
  }

  const limit = definition.type === "textarea" || definition.type === "lines" ? 4000 : 500
  if (value.length > limit) {
    return `${definition.label} is too long.`
  }

  if (definition.type === "url" && trimmed && !isSafeSocialUrl(definition.key, trimmed) && !isSafeInternalHref(trimmed)) {
    return `${definition.label} must be an approved link.`
  }

  if (definition.type === "image") {
    if (!isSafeImageValue(trimmed)) {
      return `${definition.label} must be an uploaded image or a site image path.`
    }
    if (trimmed && altText.trim().length < 2) {
      return `${definition.label} needs alt text.`
    }
  }

  if (definition.type === "lines") {
    const lines = trimmed.split("\n").map((line) => line.trim()).filter(Boolean)
    if (lines.length > 24) {
      return `${definition.label} has too many lines.`
    }
    if (lines.some((line) => line.length > 280)) {
      return `${definition.label} has a line that is too long.`
    }
  }

  return null
}

export function validateSiteContentInput(
  fields: readonly { key: string; value: string; altText?: string }[]
): string | null {
  const seen = new Set<string>()
  for (const field of fields) {
    const definition = getSiteField(field.key)
    if (!definition) {
      return "Unknown content field."
    }
    if (seen.has(field.key)) {
      return "Duplicate content field."
    }
    seen.add(field.key)
    const message = validateSiteField(definition, field.value, field.altText ?? "")
    if (message) {
      return message
    }
  }

  for (const definition of SITE_CONTENT_FIELDS) {
    if (definition.required && !seen.has(definition.key)) {
      return `${definition.label} is required.`
    }
  }

  return null
}

export type MembershipMarketingCopy = Partial<
  Record<"plan-1" | "plan-2" | "plan-3", { whoItIsFor: string; features: string[] }>
>

const MEMBERSHIP_KEYS = [
  ["plan-1", "membership.core"],
  ["plan-2", "membership.gold"],
  ["plan-3", "membership.platinum"],
] as const

export function readMembershipCopy(snapshot: SiteContentSnapshot): MembershipMarketingCopy {
  const copy: MembershipMarketingCopy = {}
  for (const [slug, prefix] of MEMBERSHIP_KEYS) {
    const tier = ELEVATE_MEMBERSHIPS.find((item) => item.slug === slug)
    const features = readSiteLines(snapshot, `${prefix}.features`)
    copy[slug] = {
      whoItIsFor: readSiteText(snapshot, `${prefix}.who`, tier?.whoItIsFor ?? ""),
      features: features.length > 0 ? features : [...(tier?.features ?? [])],
    }
  }
  return copy
}

export function readFaqItems(
  snapshot: SiteContentSnapshot
): Array<{ question: string; answer: string }> {
  const items: Array<{ question: string; answer: string }> = []
  for (let number = 1; number <= 8; number += 1) {
    const question = readSiteText(snapshot, `homepage.faq.${number}.question`, "")
    const answer = readSiteText(snapshot, `homepage.faq.${number}.answer`, "")
    if (question.trim() && answer.trim()) {
      items.push({ question: question.trim(), answer: answer.trim() })
    }
  }
  return items
}

export function readPressLines(
  snapshot: SiteContentSnapshot
): Array<{ name: string; url: string | null }> {
  return readSiteLines(snapshot, "about.press").flatMap((line): Array<{ name: string; url: string | null }> => {
    const [namePart, urlPart] = line.split("|")
    const name = namePart?.trim() ?? ""
    if (!name) {
      return []
    }
    const url = urlPart?.trim() ?? ""
    if (!url) {
      return [{ name, url: null }]
    }
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== "https:") {
        return [{ name, url: null }]
      }
      return [{ name, url: parsed.toString() }]
    } catch {
      return [{ name, url: null }]
    }
  })
}

export function applyTestimonialCopy(
  items: readonly HomepageVideoTestimonial[],
  snapshot: SiteContentSnapshot
): HomepageVideoTestimonial[] {
  return items.map((item, index) => {
    const number = index + 1
    const name = readSiteText(snapshot, `testimonial.${number}.name`, "").trim()
    const role = readSiteText(snapshot, `testimonial.${number}.role`, "").trim()
    const quote = readSiteText(snapshot, `testimonial.${number}.quote`, "").trim()
    return {
      ...item,
      displayName: name || item.displayName,
      roleContext: role || item.roleContext,
      quote: quote || item.quote,
    }
  })
}
