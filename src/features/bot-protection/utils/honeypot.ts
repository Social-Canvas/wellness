export const HONEYPOT_FIELD = "companyUrl" as const

export function isHoneypotTriggered(value: string | null | undefined): boolean {
  return Boolean(value?.trim())
}
