import { z } from "zod"

export const salesDateRangePresetSchema = z.enum([
  "all",
  "today",
  "7d",
  "30d",
  "month",
  "custom",
])

export const salesOverviewQuerySchema = z.object({
  preset: salesDateRangePresetSchema.default("all"),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
    .optional(),
})

export const salesExportFormatSchema = z.enum(["csv", "xlsx"])

export const salesExportQuerySchema = salesOverviewQuerySchema.extend({
  format: salesExportFormatSchema,
})

export type SalesOverviewQueryInput = z.infer<typeof salesOverviewQuerySchema>
export type SalesExportQueryInput = z.infer<typeof salesExportQuerySchema>
