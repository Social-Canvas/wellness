import { z } from "zod"

/** Canonical enquiry / lead types stored on `public.leads.lead_type`. */
export const LEAD_TYPES = [
  "vip",
  "retreat",
  "private_event",
  "free_taster",
  "nonprofit",
  "contact",
] as const

export type LeadType = (typeof LEAD_TYPES)[number]

/**
 * Honeypot field name. Must stay out of visible UI (sr-only / visually hidden).
 * Bots that fill it are treated as successful without persistence.
 */
export const ENQUIRY_HONEYPOT_FIELD = "companyUrl" as const

export const submitLeadSchema = z.object({
  leadType: z.enum(LEAD_TYPES),
  name: z.string().trim().min(1, "Name is required.").max(120, "Name is too long."),
  email: z.email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .max(40, "Phone number is too long.")
    .optional()
    .nullable(),
  message: z
    .string()
    .trim()
    .max(4000, "Message is too long.")
    .optional()
    .nullable(),
  source: z.string().trim().max(120).optional().nullable(),
  organizationName: z
    .string()
    .trim()
    .max(200, "Organization name is too long.")
    .optional()
    .nullable(),
  estimatedParticipants: z
    .string()
    .trim()
    .max(80, "Participant estimate is too long.")
    .optional()
    .nullable(),
  interest: z
    .string()
    .trim()
    .max(120, "Interest is too long.")
    .optional()
    .nullable(),
  /** Structured enquiry details (e.g. retreat location). */
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  /** Anti-spam honeypot — must be empty for real humans. */
  [ENQUIRY_HONEYPOT_FIELD]: z.string().max(200).optional().nullable(),
})

export type SubmitLeadInput = z.infer<typeof submitLeadSchema>

export function isHoneypotTriggered(
  value: string | null | undefined
): boolean {
  return Boolean(value?.trim())
}
