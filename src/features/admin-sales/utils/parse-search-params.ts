import {
  salesExportQuerySchema,
  salesOverviewQuerySchema,
  type SalesExportQueryInput,
  type SalesOverviewQueryInput,
} from "../schemas/date-range"
import type { SalesDateRangePreset } from "./sales-overview-types"

export function parseSalesOverviewSearchParams(
  params: Record<string, string | string[] | undefined>
): SalesOverviewQueryInput {
  const rangeRaw = Array.isArray(params.range) ? params.range[0] : params.range
  const fromRaw = Array.isArray(params.from) ? params.from[0] : params.from
  const toRaw = Array.isArray(params.to) ? params.to[0] : params.to

  const parsed = salesOverviewQuerySchema.safeParse({
    preset: (rangeRaw as SalesDateRangePreset | undefined) ?? "all",
    from: fromRaw,
    to: toRaw,
  })

  return parsed.success ? parsed.data : { preset: "all" }
}

export function parseSalesExportSearchParams(
  params: URLSearchParams
):
  | { success: true; data: SalesExportQueryInput }
  | { success: false; message: string } {
  const parsed = salesExportQuerySchema.safeParse({
    format: params.get("format") ?? undefined,
    preset: params.get("range") ?? "all",
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
  })

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid export request.",
    }
  }

  return { success: true, data: parsed.data }
}
