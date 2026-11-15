export function isAnalyticsEligible(result: {
  success: boolean
  data?: { analyticsEligible?: boolean } | null
}): boolean {
  return result.success === true && result.data?.analyticsEligible === true
}
