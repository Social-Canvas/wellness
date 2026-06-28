import type { Database } from "@/types/database/supabase"

export type Plan = Database["public"]["Tables"]["plans"]["Row"]

export type PlanPrice = Database["public"]["Tables"]["plan_prices"]["Row"]

export type BillingInterval = Database["public"]["Enums"]["billing_interval"]

export type PlanWithPrices = Plan & {
  prices: PlanPrice[]
}
