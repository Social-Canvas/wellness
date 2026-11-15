export function normalizeAnalyticsCurrency(
  value: string | null | undefined
): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) {
    return undefined
  }
  return trimmed.toUpperCase()
}
