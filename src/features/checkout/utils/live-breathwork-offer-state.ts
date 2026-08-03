/**
 * Pure Live Breathwork trial offer state.
 * Membership and registration facts must be resolved server-side.
 */

export const LIVE_BREATHWORK_INCLUDED_LABEL = "Included in your membership" as const
export const LIVE_BREATHWORK_INCLUDED_NOTE =
  "Join the upcoming session from your membership dashboard." as const
export const LIVE_BREATHWORK_MEMBER_CONFLICT =
  "This session is already included in your active membership." as const
export const LIVE_BREATHWORK_RESERVE_LABEL = "Reserve your spot" as const
export const LIVE_BREATHWORK_REGISTERED_LABEL = "You’re registered" as const
export const LIVE_BREATHWORK_UNAVAILABLE_LABEL = "No upcoming trial session" as const

export type LiveBreathworkOfferState =
  | "logged_out"
  | "non_member"
  | "member_included"
  | "already_registered"
  | "unavailable"

export type LiveBreathworkOfferFacts = {
  isAuthenticated: boolean
  hasLiveOnlineSessionsCapability: boolean
  membershipAccessActive: boolean
  alreadyRegisteredForSelectedSession: boolean
  hasEligibleUpcomingSession: boolean
  memberJoinHref?: string
  registeredHref?: string
  reserveHref?: string | null
}

export type LiveBreathworkOfferView = {
  state: LiveBreathworkOfferState
  ctaLabel: string
  ctaHref: string | null
  ctaDisabled: boolean
  allowsCheckout: boolean
  supportingText: string | null
  showPrice: boolean
}

export function hasActiveLiveMembershipAccess(input: {
  membershipAccessActive: boolean
  hasLiveOnlineSessionsCapability: boolean
}): boolean {
  return input.membershipAccessActive && input.hasLiveOnlineSessionsCapability
}

export function shouldRefuseLiveBreathworkCheckoutForMember(input: {
  membershipAccessActive: boolean
  hasLiveOnlineSessionsCapability: boolean
}): boolean {
  return hasActiveLiveMembershipAccess(input)
}

/**
 * Maps trusted server facts to Live Breathwork card / page presentation.
 */
export function buildLiveBreathworkOfferView(
  facts: LiveBreathworkOfferFacts
): LiveBreathworkOfferView {
  if (
    hasActiveLiveMembershipAccess({
      membershipAccessActive: facts.membershipAccessActive,
      hasLiveOnlineSessionsCapability: facts.hasLiveOnlineSessionsCapability,
    })
  ) {
    return {
      state: "member_included",
      ctaLabel: LIVE_BREATHWORK_INCLUDED_LABEL,
      ctaHref: null,
      ctaDisabled: true,
      allowsCheckout: false,
      supportingText: LIVE_BREATHWORK_INCLUDED_NOTE,
      showPrice: true,
    }
  }

  if (!facts.hasEligibleUpcomingSession) {
    return {
      state: "unavailable",
      ctaLabel: LIVE_BREATHWORK_UNAVAILABLE_LABEL,
      ctaHref: null,
      ctaDisabled: true,
      allowsCheckout: false,
      supportingText: "Trial purchase is only available for a selected upcoming session.",
      showPrice: true,
    }
  }

  if (facts.alreadyRegisteredForSelectedSession) {
    return {
      state: "already_registered",
      ctaLabel: LIVE_BREATHWORK_REGISTERED_LABEL,
      ctaHref: facts.registeredHref ?? "/dashboard/live-sessions",
      ctaDisabled: false,
      allowsCheckout: false,
      supportingText: null,
      showPrice: true,
    }
  }

  if (!facts.isAuthenticated) {
    return {
      state: "logged_out",
      ctaLabel: LIVE_BREATHWORK_RESERVE_LABEL,
      ctaHref: facts.reserveHref ?? "/live-breathwork",
      ctaDisabled: false,
      allowsCheckout: true,
      supportingText: null,
      showPrice: true,
    }
  }

  return {
    state: "non_member",
    ctaLabel: LIVE_BREATHWORK_RESERVE_LABEL,
    ctaHref: facts.reserveHref ?? "/live-breathwork",
    ctaDisabled: false,
    allowsCheckout: true,
    supportingText: null,
    showPrice: true,
  }
}
