import { z } from "zod"

export const flagBotTargetSchema = z.enum(["profile", "lead"])

export const flagBotRecordSchema = z.object({
  targetType: flagBotTargetSchema,
  id: z.uuid("Invalid record id."),
  suspected: z.boolean(),
  reason: z
    .string()
    .trim()
    .max(240, "Reason is too long.")
    .optional()
    .nullable(),
})

export type FlagBotRecordInput = z.infer<typeof flagBotRecordSchema>
