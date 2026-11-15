"use server"

import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  buildBotDryRunReport,
  flagBotRecord,
  type BotDryRunReport,
} from "@/features/bot-protection/services/bot-review.service"
import type { FlagBotRecordInput } from "@/features/bot-protection/schemas/flag-bot"

export async function flagBotRecordAction(
  input: FlagBotRecordInput
): Promise<ActionResult<{ id: string; suspectedBot: boolean }>> {
  const result = await flagBotRecord(input)
  if (result.success) {
    revalidatePath("/admin/bots")
  }
  return result
}

export async function getBotDryRunReportAction(): Promise<ActionResult<BotDryRunReport>> {
  return buildBotDryRunReport()
}
