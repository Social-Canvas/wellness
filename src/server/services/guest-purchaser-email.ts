export function normalizePurchaserEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase()
  if (!normalized.includes("@") || normalized.length > 320) return null
  return normalized
}
