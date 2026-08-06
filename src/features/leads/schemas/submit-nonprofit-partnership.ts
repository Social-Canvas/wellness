import { z } from "zod"

import {
  NONPROFIT_ACCESS_AUDIENCE_OPTIONS,
  NONPROFIT_PARTICIPANT_RANGE_OPTIONS,
} from "@/features/leads/utils/nonprofit-enquiry"

const participantValues = NONPROFIT_PARTICIPANT_RANGE_OPTIONS.map(
  (option) => option.value
) as [string, ...string[]]

const accessValues = NONPROFIT_ACCESS_AUDIENCE_OPTIONS.map(
  (option) => option.value
) as [string, ...string[]]

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ""
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Client/server validation for nonprofit partnership enquiries.
 * Participant estimate is informational only — no public pricing plan is assigned.
 */
export const submitNonprofitPartnershipSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Full name is required.")
    .max(120, "Name is too long."),
  email: z.email("Enter a valid work email address."),
  organizationName: z
    .string()
    .trim()
    .min(1, "Organization name is required.")
    .max(200, "Organization name is too long."),
  organizationWebsite: z
    .string()
    .trim()
    .max(300, "Website is too long.")
    .optional()
    .or(z.literal(""))
    .refine(
      (value) => {
        const trimmed = value?.trim() ?? ""
        if (!trimmed) {
          return true
        }
        try {
          const url = new URL(
            trimmed.startsWith("http") ? trimmed : `https://${trimmed}`
          )
          return Boolean(url.hostname.includes("."))
        } catch {
          return false
        }
      },
      { message: "Enter a valid website URL." }
    ),
  phone: z
    .string()
    .trim()
    .max(40, "Phone number is too long.")
    .optional()
    .or(z.literal("")),
  role: z
    .string()
    .trim()
    .max(120, "Role is too long.")
    .optional()
    .or(z.literal("")),
  estimatedParticipants: z.enum(participantValues, {
    message: "Select an estimated number of participants.",
  }),
  accessAudience: z.enum(accessValues, {
    message: "Select who will receive access.",
  }),
  partnershipNotes: z
    .string()
    .trim()
    .max(2000, "Partnership notes are too long.")
    .optional()
    .or(z.literal("")),
  message: z
    .string()
    .trim()
    .max(2000, "Message is too long.")
    .optional()
    .or(z.literal("")),
})

export type SubmitNonprofitPartnershipInput = z.infer<
  typeof submitNonprofitPartnershipSchema
>

export function normalizeNonprofitPartnershipInput(
  input: SubmitNonprofitPartnershipInput
) {
  return {
    ...input,
    organizationWebsite: emptyToNull(input.organizationWebsite),
    phone: emptyToNull(input.phone),
    role: emptyToNull(input.role),
    partnershipNotes: emptyToNull(input.partnershipNotes),
    message: emptyToNull(input.message),
  }
}
