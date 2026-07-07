import "server-only"

import type { ActionResult } from "@/features/auth/services/auth.service"
import {
  submitLeadSchema,
  type SubmitLeadInput,
} from "@/features/leads/schemas/submit-lead"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database/supabase"

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

function validationFailure(message: string): ActionResult<never> {
  return failure("validation_error", message)
}

function firstValidationMessage(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Invalid input."
}

function mapDatabaseError(): ActionResult<never> {
  return failure(
    "provider_error",
    "Unable to submit your request right now. Please try again."
  )
}

export async function submitLead(
  input: SubmitLeadInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = submitLeadSchema.safeParse(input)

  if (!parsed.success) {
    return validationFailure(firstValidationMessage(parsed.error))
  }

  const row: Database["public"]["Tables"]["leads"]["Insert"] = {
    lead_type: parsed.data.leadType,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone ?? null,
    message: parsed.data.message ?? null,
    source: parsed.data.source ?? null,
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("leads")
      .insert(row)
      .select("id")
      .single()

    if (error || !data) {
      return mapDatabaseError()
    }

    return success({ id: data.id })
  } catch {
    return failure("unknown_error", "Something went wrong. Please try again.")
  }
}
