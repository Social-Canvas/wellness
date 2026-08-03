import { z } from "zod"

import { LIVE_SESSION_KINDS } from "@/features/live-sessions/utils/live-sessions"

export const liveSessionKindSchema = z.enum(LIVE_SESSION_KINDS)

export const createLiveSessionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional().nullable(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }).optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  sessionKind: liveSessionKindSchema.default("membership_weekly"),
  allowsPublicTrial: z.boolean().default(false),
  trialOpen: z.boolean().default(false),
  accessType: z
    .enum(["public", "authenticated", "member_only", "plan_specific"])
    .default("member_only"),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  calendlyUrl: z.string().url().optional().nullable(),
  zoomParticipantUrl: z.string().url().optional().nullable(),
  zoomHostUrl: z.string().url().optional().nullable(),
})

export type CreateLiveSessionInput = z.infer<typeof createLiveSessionSchema>

export const updateLiveSessionSchema = createLiveSessionSchema.partial().extend({
  completedAt: z.string().datetime({ offset: true }).optional().nullable(),
})

export type UpdateLiveSessionInput = z.infer<typeof updateLiveSessionSchema>

export const liveSessionFeedbackSchema = z.object({
  registrationId: z.uuid("Invalid registration id."),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  comment: z.string().trim().max(2000).optional().nullable(),
  interestedInMembership: z.boolean().optional().nullable(),
})

export type LiveSessionFeedbackInput = z.infer<typeof liveSessionFeedbackSchema>

export const createLiveTrialCheckoutSchema = z.object({
  liveClassId: z.uuid("Invalid live session id."),
})

export type CreateLiveTrialCheckoutInput = z.infer<
  typeof createLiveTrialCheckoutSchema
>
