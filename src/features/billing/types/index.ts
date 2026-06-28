import type { Database } from "@/types/database/supabase"

export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"]

export type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"]

export type CheckoutSessionResult = {
  sessionId: string
  url: string
}

export type BillingPortalSessionResult = {
  url: string
}

export type CurrentSubscription = {
  id: string
  userId: string
  planId: string
  planName: string
  planSlug: string
  status: SubscriptionStatus
  stripeCustomerId: string
  stripeSubscriptionId: string
  stripePriceId: string
  billingInterval: Database["public"]["Enums"]["billing_interval"] | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  canceledAt: string | null
  endedAt: string | null
}
