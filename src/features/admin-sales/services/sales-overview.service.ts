import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import type { ActionResult } from "@/features/auth/services/auth.service"
import { getCurrentUser } from "@/features/auth/services/auth.service"
import type { AuthSessionUser, UserRole } from "@/features/auth/types"
import {
  salesExportQuerySchema,
  salesOverviewQuerySchema,
} from "@/features/admin-sales/schemas/date-range"
import type { SalesOverviewSnapshot } from "@/features/admin-sales/types"
import {
  buildSalesOverviewCsv,
  buildSalesOverviewSnapshot,
  resolveSalesDateRange,
  type OverviewMarketingConsentInput,
  type OverviewOrderInput,
  type OverviewProfileInput,
  type OverviewSponsoredMemberInput,
  type OverviewSubscriptionInput,
} from "@/features/admin-sales/utils/sales-overview-core"
import { buildSalesOverviewXlsx } from "@/features/admin-sales/utils/export-xlsx"
import { createAdminClient } from "@/lib/supabase/admin"
import { logger, providerErrorFields, safeErrorMessage } from "@/server/utils/logger"

/** Untyped admin client for tables/columns ahead of generated Database types. */
function salesDb(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient
}

const ADMIN_ROLES = new Set<UserRole>(["admin", "super_admin"])

function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

function failure(code: string, message: string): ActionResult<never> {
  return { success: false, error: { code, message } }
}

async function requireAdminActor(): Promise<ActionResult<AuthSessionUser>> {
  const actorResult = await getCurrentUser()

  if (!actorResult.success) {
    return actorResult
  }

  if (!ADMIN_ROLES.has(actorResult.data.role)) {
    return failure(
      "forbidden",
      "You do not have permission to view sales overview."
    )
  }

  return actorResult
}

type ProfileJoin = {
  id: string
  email: string
  role: string
  full_name: string | null
} | null

function asProfileJoin(value: unknown): ProfileJoin {
  if (!value || typeof value !== "object") {
    return null
  }
  const row = value as Record<string, unknown>
  if (typeof row.email !== "string" || typeof row.id !== "string") {
    return null
  }
  return {
    id: row.id,
    email: row.email,
    role: typeof row.role === "string" ? row.role : "user",
    full_name: typeof row.full_name === "string" ? row.full_name : null,
  }
}

function asPlanJoin(value: unknown): { id: string; name: string; slug: string } | null {
  if (!value || typeof value !== "object") {
    return null
  }
  const row = value as Record<string, unknown>
  if (typeof row.name !== "string") {
    return null
  }
  return {
    id: typeof row.id === "string" ? row.id : "",
    name: row.name,
    slug: typeof row.slug === "string" ? row.slug : "",
  }
}

async function loadOverviewRows(): Promise<{
  profiles: OverviewProfileInput[]
  orders: OverviewOrderInput[]
  subscriptions: OverviewSubscriptionInput[]
  sponsoredMembers: OverviewSponsoredMemberInput[]
  marketingConsents: OverviewMarketingConsentInput[]
}> {
  const typed = createAdminClient()
  const untyped = salesDb()

  type OrderRow = {
    id: string
    user_id: string
    status: string
    amount_paid: number
    currency: string
    purchased_at: string | null
    created_at: string
    stripe_checkout_session_id: string | null
    profiles: unknown
    order_items: Array<{
      quantity: number
      unit_amount: number
      currency: string
      product_id: string
      products: unknown
    }> | null
  }

  type SubscriptionRow = {
    id: string
    user_id: string
    status: string
    plan_id: string
    stripe_subscription_id: string
    access_source?: string | null
    current_period_end: string | null
    cancel_at_period_end: boolean
    created_at: string
    profiles: unknown
    plans: unknown
  }

  type SponsoredRow = {
    id: string
    user_id: string | null
    email: string
    status: string
    activated_at: string | null
    profiles: unknown
    plans: unknown
  }

  const [
    profilesResult,
    ordersResult,
    subscriptionsResult,
    sponsoredResult,
    marketingResult,
  ] = await Promise.all([
    typed.from("profiles").select("id, email, role, full_name, created_at"),
    typed
      .from("orders")
      .select(
        `
        id,
        user_id,
        status,
        amount_paid,
        currency,
        purchased_at,
        created_at,
        stripe_checkout_session_id,
        profiles!inner ( id, email, role, full_name ),
        order_items (
          quantity,
          unit_amount,
          currency,
          product_id,
          products!order_items_product_id_fkey ( id, title )
        )
      `
      )
      .eq("status", "paid"),
    untyped
      .from("subscriptions")
      .select(
        `
        id,
        user_id,
        status,
        plan_id,
        stripe_subscription_id,
        access_source,
        current_period_end,
        cancel_at_period_end,
        created_at,
        profiles!inner ( id, email, role, full_name ),
        plans!plan_id ( id, name, slug )
      `
      ),
    untyped
      .from("organization_members")
      .select(
        `
        id,
        user_id,
        email,
        status,
        activated_at,
        assigned_plan_id,
        plans:assigned_plan_id ( id, name, slug ),
        profiles:user_id ( id, email, role, full_name )
      `
      )
      .eq("status", "active"),
    typed
      .from("marketing_consents")
      .select("email, status, source, consented_at"),
  ])

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message)
  }
  if (ordersResult.error) {
    throw new Error(ordersResult.error.message)
  }
  if (subscriptionsResult.error) {
    throw new Error(subscriptionsResult.error.message)
  }
  if (sponsoredResult.error) {
    throw new Error(sponsoredResult.error.message)
  }
  // Marketing consents may be mid-migration; degrade gracefully.
  if (marketingResult.error) {
    logger.warn("[admin-sales] marketing_consents unavailable", {
      message: marketingResult.error.message,
    })
  }

  const profiles: OverviewProfileInput[] = (profilesResult.data ?? []).map(
    (row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      fullName: row.full_name,
      createdAt: row.created_at,
    })
  )

  const orderRows = (ordersResult.data ?? []) as unknown as OrderRow[]
  const orders: OverviewOrderInput[] = orderRows.map((row) => {
    const profile = asProfileJoin(row.profiles)
    const itemsRaw = Array.isArray(row.order_items) ? row.order_items : []
    return {
      id: row.id,
      userId: row.user_id,
      status: row.status,
      amountPaidCents: row.amount_paid,
      currency: row.currency,
      purchasedAt: row.purchased_at,
      createdAt: row.created_at,
      stripeCheckoutSessionId: row.stripe_checkout_session_id,
      customerEmail: profile?.email ?? "",
      customerName: profile?.full_name ?? null,
      customerRole: profile?.role ?? "user",
      items: itemsRaw.map((item) => {
        const product =
          item.products && typeof item.products === "object"
            ? (item.products as { id?: string; title?: string })
            : null
        return {
          productId:
            (typeof product?.id === "string" && product.id) ||
            (typeof item.product_id === "string" ? item.product_id : "unknown"),
          productName:
            typeof product?.title === "string"
              ? product.title
              : "Unknown product",
          quantity: item.quantity,
          unitAmountCents: item.unit_amount,
          currency: item.currency,
        }
      }),
    }
  })

  const subscriptionRows = (subscriptionsResult.data ??
    []) as unknown as SubscriptionRow[]
  const subscriptions: OverviewSubscriptionInput[] = subscriptionRows.map(
    (row) => {
      const profile = asProfileJoin(row.profiles)
      const plan = asPlanJoin(row.plans)
      return {
        id: row.id,
        userId: row.user_id,
        status: row.status,
        planId: row.plan_id,
        planName: plan?.name ?? "Membership",
        planSlug: plan?.slug ?? "",
        stripeSubscriptionId: row.stripe_subscription_id,
        accessSource: row.access_source ?? null,
        currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: row.cancel_at_period_end,
        createdAt: row.created_at,
        customerEmail: profile?.email ?? "",
        customerName: profile?.full_name ?? null,
        customerRole: profile?.role ?? "user",
      }
    }
  )

  const sponsoredRows = (sponsoredResult.data ?? []) as unknown as SponsoredRow[]
  const sponsoredMembers: OverviewSponsoredMemberInput[] = sponsoredRows.map(
    (row) => {
      const profile = asProfileJoin(row.profiles)
      const plan = asPlanJoin(row.plans)
      return {
        id: row.id,
        userId: row.user_id,
        email: row.email,
        status: row.status,
        planName: plan?.name ?? null,
        planSlug: plan?.slug ?? null,
        activatedAt: row.activated_at,
        customerName: profile?.full_name ?? null,
        customerRole: profile?.role ?? null,
      }
    }
  )

  const marketingConsents: OverviewMarketingConsentInput[] = (
    marketingResult.data ?? []
  ).map((row) => ({
    email: row.email,
    status: row.status,
    source: row.source,
    consentedAt: row.consented_at,
  }))

  return {
    profiles,
    orders,
    subscriptions,
    sponsoredMembers,
    marketingConsents,
  }
}

export async function getSalesOverview(
  rawQuery: unknown = {}
): Promise<ActionResult<SalesOverviewSnapshot>> {
  const actorResult = await requireAdminActor()
  if (!actorResult.success) {
    return actorResult
  }

  const parsed = salesOverviewQuerySchema.safeParse(rawQuery)
  if (!parsed.success) {
    return failure(
      "validation_error",
      parsed.error.issues[0]?.message ?? "Invalid date filter."
    )
  }

  try {
    const dateRange = resolveSalesDateRange({
      preset: parsed.data.preset,
      from: parsed.data.from,
      to: parsed.data.to,
    })
    const rows = await loadOverviewRows()
    const snapshot = buildSalesOverviewSnapshot({
      dateRange,
      profiles: rows.profiles,
      orders: rows.orders,
      subscriptions: rows.subscriptions,
      sponsoredMembers: rows.sponsoredMembers,
      marketingConsents: rows.marketingConsents,
    })
    return success(snapshot)
  } catch (caughtError) {
    const provider = providerErrorFields(caughtError)
    logger.error("[admin-sales] getSalesOverview failed", {
      operation: "getSalesOverview",
      error: provider.message || safeErrorMessage(caughtError),
      code: provider.code,
      details: provider.details,
      hint: provider.hint,
    })
    return failure(
      "provider_error",
      "Unable to load sales overview. Please try again."
    )
  }
}

export type SalesOverviewExportResult = {
  filename: string
  contentType: string
  body: Buffer
}

export async function exportSalesOverview(
  rawQuery: unknown
): Promise<ActionResult<SalesOverviewExportResult>> {
  const actorResult = await requireAdminActor()
  if (!actorResult.success) {
    return actorResult
  }

  const parsed = salesExportQuerySchema.safeParse(rawQuery)
  if (!parsed.success) {
    return failure(
      "validation_error",
      parsed.error.issues[0]?.message ?? "Invalid export request."
    )
  }

  const overviewResult = await getSalesOverview({
    preset: parsed.data.preset,
    from: parsed.data.from,
    to: parsed.data.to,
  })

  if (!overviewResult.success) {
    return overviewResult
  }

  const stamp = overviewResult.data.generatedAt.slice(0, 10)
  const rangeSlug = overviewResult.data.dateRange.preset

  try {
    if (parsed.data.format === "csv") {
      const csv = buildSalesOverviewCsv(overviewResult.data)
      return success({
        filename: `elevate-sales-overview-${rangeSlug}-${stamp}.csv`,
        contentType: "text/csv; charset=utf-8",
        body: Buffer.from(csv, "utf8"),
      })
    }

    const xlsx = await buildSalesOverviewXlsx(overviewResult.data)
    return success({
      filename: `elevate-sales-overview-${rangeSlug}-${stamp}.xlsx`,
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      body: xlsx,
    })
  } catch (caughtError) {
    logger.error("[admin-sales] exportSalesOverview failed", {
      operation: "exportSalesOverview",
      error: safeErrorMessage(caughtError),
    })
    return failure("provider_error", "Unable to export sales overview.")
  }
}
