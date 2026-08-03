export type LiveSessionPublic = {
  id: string
  title: string
  description: string | null
  startsAt: string | null
  endsAt: string | null
  sessionKind: "membership_weekly" | "public_trial"
  allowsPublicTrial: boolean
  trialOpen: boolean
  capacity: number | null
  status: string
  accessType: string
  completedAt: string | null
}

export type LiveSessionAdmin = LiveSessionPublic & {
  calendlyUrl: string | null
  hasParticipantUrl: boolean
  hasHostUrl: boolean
  registrationCount: number
  trialRegistrationCount: number
}

export type LiveSessionJoinResult = {
  liveClassId: string
  joinUrl: string
  opensAtHint: string
}
