import { z } from "zod"

export const submitLeadSchema = z.object({
  leadType: z.enum(["vip", "retreat", "private_event", "free_taster"]),
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
  /** Structured enquiry details (e.g. approved nonprofit plan). */
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
})

export type SubmitLeadInput = z.infer<typeof submitLeadSchema>
