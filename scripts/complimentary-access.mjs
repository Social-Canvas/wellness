#!/usr/bin/env node

/**
 * Complimentary tester access tooling.
 *
 * Plan grants (existing):
 *   Insert a clearly-marked complimentary subscription row (comp_ prefix).
 *   Does NOT call Stripe.
 *
 * Product grants (standalone courses / digital products):
 *   Insert a product_entitlements row with source=complimentary.
 *   Unlocks courses via products.granted_course_id + entitlementService.
 *   Does NOT create Stripe customers, checkout sessions, payments, or paid orders.
 *
 * Usage:
 *   node scripts/complimentary-access.mjs status  --email <email> [--plan plan-3] [--env-file .env.local]
 *   node scripts/complimentary-access.mjs grant   --email <email> [--plan plan-3] [--dry-run] [--env-file .env.local]
 *   node scripts/complimentary-access.mjs revoke  --email <email> [--env-file .env.local]
 *   node scripts/complimentary-access.mjs status-product  --email <email> --product <slug> [--env-file .env.local]
 *   node scripts/complimentary-access.mjs grant-product   --email <email> --product <slug> [--dry-run] [--env-file .env.local]
 *   node scripts/complimentary-access.mjs revoke-product  --email <email> --product <slug> [--env-file .env.local]
 */

import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { createClient } from "@supabase/supabase-js"

const AUDIT_REASON = "complimentary launch testing access"
const COMP_PREFIX = "comp_launch_testing"
const DEFAULT_PLAN_SLUG = "plan-3"
const DEFAULT_PRODUCT_SLUG = "autoimmune-masterclass"
const GRANT_PERIOD_DAYS = 365
const PRODUCT_ENTITLEMENT_SOURCE = "complimentary"

function parseArgValue(name, fallback = "") {
  const index = process.argv.indexOf(name)
  if (index === -1 || index + 1 >= process.argv.length) return fallback
  return process.argv[index + 1]
}

function parseDotEnv(pathname) {
  const env = {}
  if (!existsSync(pathname)) return env
  const content = readFileSync(pathname, "utf8")
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const idx = line.indexOf("=")
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line
      .slice(idx + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "")
    env[key] = value
  }
  return env
}

function redactId(id) {
  if (!id) return "(none)"
  if (id.length <= 10) return `${id.slice(0, 2)}***`
  return `${id.slice(0, 6)}***${id.slice(-4)}`
}

function redactMarker(marker) {
  if (!marker) return "(none)"
  const prefix = `${COMP_PREFIX}_`
  if (marker.startsWith(prefix)) {
    return `${prefix}${redactId(marker.slice(prefix.length))}`
  }
  return redactId(marker)
}

function projectRefFromUrl(url) {
  const host = String(url).replace(/^https?:\/\//, "").replace(/\/.*$/, "")
  const ref = host.split(".")[0] ?? ""
  return ref.length <= 6 ? `${ref}***` : `${ref.slice(0, 3)}***${ref.slice(-3)}`
}

function createSupabaseFromEnv(envFilePath) {
  const env = parseDotEnv(envFilePath)
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    env.SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)."
    )
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return { client, projectRef: projectRefFromUrl(supabaseUrl) }
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase()
}

async function resolveProfile(client, email) {
  const normalized = normalizeEmail(email)
  if (!normalized || !normalized.includes("@")) {
    throw new Error("A valid --email is required.")
  }

  const { data, error } = await client
    .from("profiles")
    .select("id, auth_user_id, email, role")
    .ilike("email", normalized)

  if (error) throw new Error(`Profile lookup failed: ${error.message}`)

  const exact = (data ?? []).filter(
    (row) => normalizeEmail(row.email) === normalized
  )

  if (exact.length > 1) {
    throw new Error(
      `Ambiguous account: ${exact.length} profiles share this email. Resolve manually.`
    )
  }

  return exact[0] ?? null
}

async function resolvePlan(client, planSlug) {
  const { data: plan, error } = await client
    .from("plans")
    .select("id, slug, name, is_active")
    .eq("slug", planSlug)
    .maybeSingle()

  if (error) throw new Error(`Plan lookup failed: ${error.message}`)
  if (!plan) throw new Error(`Plan "${planSlug}" not found.`)

  const { data: price, error: priceError } = await client
    .from("plan_prices")
    .select("stripe_price_id, billing_interval, is_active")
    .eq("plan_id", plan.id)
    .eq("is_active", true)
    .order("billing_interval", { ascending: true })

  if (priceError) throw new Error(`Plan price lookup failed: ${priceError.message}`)
  if (!price || price.length === 0) {
    throw new Error(`No active plan price configured for "${planSlug}".`)
  }

  const monthly = price.find((p) => p.billing_interval === "monthly") ?? price[0]

  return { plan, stripePriceId: monthly.stripe_price_id }
}

async function resolveProduct(client, productSlug) {
  const { data: product, error } = await client
    .from("products")
    .select(
      "id, slug, title, status, purchase_mode, price_amount, granted_course_id, stripe_price_id"
    )
    .eq("slug", productSlug)
    .maybeSingle()

  if (error) throw new Error(`Product lookup failed: ${error.message}`)
  if (!product) throw new Error(`Product "${productSlug}" not found.`)

  let course = null
  if (product.granted_course_id) {
    const { data: courseRow, error: courseError } = await client
      .from("courses")
      .select("id, slug, title, status")
      .eq("id", product.granted_course_id)
      .maybeSingle()

    if (courseError) throw new Error(`Course lookup failed: ${courseError.message}`)
    course = courseRow
  }

  return { product, course }
}

async function listPlanCourses(client, planId) {
  const { data: access, error } = await client
    .from("content_access")
    .select("content_type, content_id")
    .eq("plan_id", planId)
    .eq("content_type", "course")

  if (error) throw new Error(`content_access lookup failed: ${error.message}`)

  const courseIds = (access ?? []).map((row) => row.content_id)
  if (courseIds.length === 0) return []

  const { data: courses, error: coursesError } = await client
    .from("courses")
    .select("id, slug, title, status")
    .in("id", courseIds)
    .order("sort_order", { ascending: true })

  if (coursesError) throw new Error(`courses lookup failed: ${coursesError.message}`)
  return courses ?? []
}

function compSubscriptionKey(profileId) {
  return `${COMP_PREFIX}_${profileId}`
}

async function findCompSubscriptions(client, profileId) {
  const { data, error } = await client
    .from("subscriptions")
    .select(
      "id, plan_id, status, stripe_subscription_id, stripe_customer_id, current_period_end, cancel_at_period_end, access_source"
    )
    .eq("user_id", profileId)
    .like("stripe_subscription_id", `${COMP_PREFIX}_%`)

  if (error) throw new Error(`Subscription lookup failed: ${error.message}`)
  return data ?? []
}

async function findProductEntitlements(client, profileId, productId) {
  const { data, error } = await client
    .from("product_entitlements")
    .select("id, user_id, product_id, source, created_at")
    .eq("user_id", profileId)
    .eq("product_id", productId)

  if (error) throw new Error(`product_entitlements lookup failed: ${error.message}`)
  return data ?? []
}

async function countPaidProductOrders(client, profileId, productId) {
  const { data: orders, error } = await client
    .from("orders")
    .select("id")
    .eq("user_id", profileId)
    .eq("status", "paid")

  if (error) throw new Error(`orders lookup failed: ${error.message}`)
  if (!orders?.length) return 0

  const { count, error: itemsError } = await client
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .in(
      "order_id",
      orders.map((o) => o.id)
    )
    .eq("product_id", productId)

  if (itemsError) throw new Error(`order_items lookup failed: ${itemsError.message}`)
  return count ?? 0
}

async function commandStatus({ client, projectRef, email, planSlug }) {
  const profile = await resolveProfile(client, email)
  const { plan } = await resolvePlan(client, planSlug)
  const planCourses = await listPlanCourses(client, plan.id)

  const summary = {
    projectRef,
    email: normalizeEmail(email),
    accountExists: Boolean(profile),
    profileIdRedacted: profile ? redactId(profile.id) : "(no account)",
    role: profile?.role ?? null,
    plan: { slug: plan.slug, isActive: plan.is_active },
    planCourses: planCourses.map((c) => ({
      slug: c.slug,
      status: c.status,
    })),
    complimentaryGrants: [],
  }

  if (profile) {
    const comps = await findCompSubscriptions(client, profile.id)
    summary.complimentaryGrants = comps.map((c) => ({
      subscriptionIdRedacted: redactId(c.id),
      marker: redactMarker(c.stripe_subscription_id),
      status: c.status,
      accessSource: c.access_source,
      currentPeriodEnd: c.current_period_end,
      cancelAtPeriodEnd: c.cancel_at_period_end,
    }))
  }

  console.log(JSON.stringify(summary, null, 2))
  return summary
}

async function commandGrant({ client, projectRef, email, planSlug, dryRun }) {
  const profile = await resolveProfile(client, email)

  if (!profile) {
    console.log(
      JSON.stringify(
        {
          projectRef,
          email: normalizeEmail(email),
          accountExists: false,
          action: "none",
          message:
            "No account found for this email. The tester must sign up first; " +
            "no password is invented and no access is granted.",
        },
        null,
        2
      )
    )
    return { granted: false, reason: "account_missing" }
  }

  const { plan, stripePriceId } = await resolvePlan(client, planSlug)
  const planCourses = await listPlanCourses(client, plan.id)
  const marker = compSubscriptionKey(profile.id)
  const now = new Date()
  const periodEnd = new Date(now.getTime() + GRANT_PERIOD_DAYS * 24 * 60 * 60 * 1000)

  const payload = {
    user_id: profile.id,
    plan_id: plan.id,
    stripe_customer_id: `${COMP_PREFIX}_cus_${profile.id}`,
    stripe_subscription_id: marker,
    stripe_price_id: stripePriceId,
    status: "active",
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    cancel_at_period_end: false,
    access_source: "complimentary",
  }

  const existing = await findCompSubscriptions(client, profile.id)
  const reusedForPlan = existing.find((row) => row.plan_id === plan.id)

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          projectRef,
          email: normalizeEmail(email),
          profileIdRedacted: redactId(profile.id),
          auditReason: AUDIT_REASON,
          plan: plan.slug,
          wouldReuseExisting: Boolean(reusedForPlan),
          planCourses: planCourses.map((c) => ({ slug: c.slug, status: c.status })),
          dryRun: true,
        },
        null,
        2
      )
    )
    return { granted: false, reason: "dry_run" }
  }

  const { data, error } = await client
    .from("subscriptions")
    .upsert(payload, { onConflict: "stripe_subscription_id" })
    .select(
      "id, plan_id, status, stripe_subscription_id, current_period_end, cancel_at_period_end"
    )
    .single()

  if (error || !data) {
    throw new Error(
      `Grant failed: ${error ? error.message : "no row returned"}`
    )
  }

  const result = {
    projectRef,
    email: normalizeEmail(email),
    profileIdRedacted: redactId(profile.id),
    auditReason: AUDIT_REASON,
    action: reusedForPlan ? "reused/updated" : "created",
    subscriptionIdRedacted: redactId(data.id),
    marker: redactMarker(data.stripe_subscription_id),
    plan: plan.slug,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
    grantedCourses: planCourses.map((c) => ({ slug: c.slug, status: c.status })),
    stripeCallsMade: 0,
    emailsSent: 0,
    muxChanges: 0,
  }

  console.log(JSON.stringify(result, null, 2))
  return { granted: true, result }
}

async function commandRevoke({ client, projectRef, email }) {
  const profile = await resolveProfile(client, email)

  if (!profile) {
    console.log(
      JSON.stringify(
        {
          projectRef,
          email: normalizeEmail(email),
          accountExists: false,
          action: "none",
          message: "No account found for this email; nothing to revoke.",
        },
        null,
        2
      )
    )
    return { revoked: 0 }
  }

  const existing = await findCompSubscriptions(client, profile.id)

  if (existing.length === 0) {
    console.log(
      JSON.stringify(
        {
          projectRef,
          email: normalizeEmail(email),
          profileIdRedacted: redactId(profile.id),
          action: "none",
          message: "No complimentary grants found; nothing to revoke.",
        },
        null,
        2
      )
    )
    return { revoked: 0 }
  }

  const { data, error } = await client
    .from("subscriptions")
    .delete()
    .eq("user_id", profile.id)
    .like("stripe_subscription_id", `${COMP_PREFIX}_%`)
    .select("id, stripe_subscription_id")

  if (error) throw new Error(`Revoke failed: ${error.message}`)

  console.log(
    JSON.stringify(
      {
        projectRef,
        email: normalizeEmail(email),
        profileIdRedacted: redactId(profile.id),
        action: "revoked",
        revokedCount: (data ?? []).length,
        markers: (data ?? []).map((row) => redactMarker(row.stripe_subscription_id)),
      },
      null,
      2
    )
  )
  return { revoked: (data ?? []).length }
}

async function commandStatusProduct({ client, projectRef, email, productSlug }) {
  const profile = await resolveProfile(client, email)
  const { product, course } = await resolveProduct(client, productSlug)

  if (!course && product.granted_course_id) {
    throw new Error(
      `Product "${productSlug}" references a missing course; stop and resolve manually.`
    )
  }

  const summary = {
    projectRef,
    email: normalizeEmail(email),
    accountExists: Boolean(profile),
    profileIdRedacted: profile ? redactId(profile.id) : "(no account)",
    product: {
      slug: product.slug,
      status: product.status,
      purchaseMode: product.purchase_mode,
      priceAmount: product.price_amount,
      idRedacted: redactId(product.id),
    },
    course: course
      ? { slug: course.slug, status: course.status, idRedacted: redactId(course.id) }
      : null,
    complimentaryProductEntitlements: [],
    paidOrderCount: 0,
  }

  if (profile) {
    const ents = await findProductEntitlements(client, profile.id, product.id)
    summary.complimentaryProductEntitlements = ents
      .filter((row) => row.source === PRODUCT_ENTITLEMENT_SOURCE)
      .map((row) => ({
        entitlementIdRedacted: redactId(row.id),
        source: row.source,
        createdAt: row.created_at,
      }))
    summary.otherProductEntitlements = ents
      .filter((row) => row.source !== PRODUCT_ENTITLEMENT_SOURCE)
      .map((row) => ({
        entitlementIdRedacted: redactId(row.id),
        source: row.source,
        createdAt: row.created_at,
      }))
    summary.paidOrderCount = await countPaidProductOrders(
      client,
      profile.id,
      product.id
    )
  }

  console.log(JSON.stringify(summary, null, 2))
  return summary
}

async function commandGrantProduct({
  client,
  projectRef,
  email,
  productSlug,
  dryRun,
}) {
  const profile = await resolveProfile(client, email)

  if (!profile) {
    console.log(
      JSON.stringify(
        {
          projectRef,
          email: normalizeEmail(email),
          accountExists: false,
          action: "none",
          message:
            "No account found for this email. The tester must sign up first; " +
            "no password is invented and no access is granted.",
        },
        null,
        2
      )
    )
    return { granted: false, reason: "account_missing" }
  }

  const { product, course } = await resolveProduct(client, productSlug)

  if (!product.granted_course_id || !course) {
    throw new Error(
      `Product "${productSlug}" has no resolvable granted course; refusing grant.`
    )
  }

  const existing = await findProductEntitlements(client, profile.id, product.id)
  const existingComp = existing.find((row) => row.source === PRODUCT_ENTITLEMENT_SOURCE)
  const paidOrderCount = await countPaidProductOrders(client, profile.id, product.id)

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          projectRef,
          email: normalizeEmail(email),
          profileIdRedacted: redactId(profile.id),
          auditReason: AUDIT_REASON,
          product: product.slug,
          course: course.slug,
          wouldReuseExisting: Boolean(existingComp),
          paidOrderCount,
          dryRun: true,
          stripeCallsMade: 0,
        },
        null,
        2
      )
    )
    return { granted: false, reason: "dry_run" }
  }

  if (existingComp) {
    console.log(
      JSON.stringify(
        {
          projectRef,
          email: normalizeEmail(email),
          profileIdRedacted: redactId(profile.id),
          auditReason: AUDIT_REASON,
          action: "already_granted",
          entitlementIdRedacted: redactId(existingComp.id),
          source: existingComp.source,
          product: product.slug,
          course: course.slug,
          paidOrderCount,
          stripeCallsMade: 0,
          emailsSent: 0,
          fakeOrdersCreated: 0,
        },
        null,
        2
      )
    )
    return { granted: true, reason: "already_granted" }
  }

  // Do not overwrite a non-complimentary entitlement row (e.g. purchase/included).
  const blocking = existing.find((row) => row.source !== PRODUCT_ENTITLEMENT_SOURCE)
  if (blocking) {
    console.log(
      JSON.stringify(
        {
          projectRef,
          email: normalizeEmail(email),
          profileIdRedacted: redactId(profile.id),
          action: "skipped",
          message:
            "A non-complimentary product entitlement already exists; " +
            "access remains via that source. No complimentary row created.",
          existingSource: blocking.source,
          entitlementIdRedacted: redactId(blocking.id),
          product: product.slug,
          course: course.slug,
          paidOrderCount,
          stripeCallsMade: 0,
        },
        null,
        2
      )
    )
    return { granted: false, reason: "other_source_present" }
  }

  const { data, error } = await client
    .from("product_entitlements")
    .insert({
      user_id: profile.id,
      product_id: product.id,
      source: PRODUCT_ENTITLEMENT_SOURCE,
    })
    .select("id, source, created_at")
    .single()

  if (error || !data) {
    throw new Error(
      `Product grant failed: ${error ? error.message : "no row returned"}`
    )
  }

  console.log(
    JSON.stringify(
      {
        projectRef,
        email: normalizeEmail(email),
        profileIdRedacted: redactId(profile.id),
        auditReason: AUDIT_REASON,
        action: "created",
        entitlementIdRedacted: redactId(data.id),
        source: data.source,
        product: product.slug,
        course: course.slug,
        paidOrderCount,
        stripeCallsMade: 0,
        emailsSent: 0,
        fakeOrdersCreated: 0,
        membershipUnchanged: true,
      },
      null,
      2
    )
  )
  return { granted: true, reason: "created" }
}

async function commandRevokeProduct({ client, projectRef, email, productSlug }) {
  const profile = await resolveProfile(client, email)

  if (!profile) {
    console.log(
      JSON.stringify(
        {
          projectRef,
          email: normalizeEmail(email),
          accountExists: false,
          action: "none",
          message: "No account found for this email; nothing to revoke.",
        },
        null,
        2
      )
    )
    return { revoked: 0 }
  }

  const { product, course } = await resolveProduct(client, productSlug)
  const paidOrderCountBefore = await countPaidProductOrders(
    client,
    profile.id,
    product.id
  )

  const { data, error } = await client
    .from("product_entitlements")
    .delete()
    .eq("user_id", profile.id)
    .eq("product_id", product.id)
    .eq("source", PRODUCT_ENTITLEMENT_SOURCE)
    .select("id, source")

  if (error) throw new Error(`Product revoke failed: ${error.message}`)

  const paidOrderCountAfter = await countPaidProductOrders(
    client,
    profile.id,
    product.id
  )

  console.log(
    JSON.stringify(
      {
        projectRef,
        email: normalizeEmail(email),
        profileIdRedacted: redactId(profile.id),
        action: (data ?? []).length > 0 ? "revoked" : "none",
        revokedCount: (data ?? []).length,
        product: product.slug,
        course: course?.slug ?? null,
        paidOrdersPreserved: paidOrderCountBefore === paidOrderCountAfter,
        paidOrderCount: paidOrderCountAfter,
        message:
          (data ?? []).length === 0
            ? "No complimentary product entitlement found; nothing to revoke."
            : "Removed complimentary product entitlement only.",
      },
      null,
      2
    )
  )
  return { revoked: (data ?? []).length }
}

function printUsage() {
  console.log(`Complimentary tester access tooling

Plan (membership) commands:
  node scripts/complimentary-access.mjs status  --email <email> [--plan ${DEFAULT_PLAN_SLUG}] [--env-file .env.local]
  node scripts/complimentary-access.mjs grant   --email <email> [--plan ${DEFAULT_PLAN_SLUG}] [--dry-run] [--env-file .env.local]
  node scripts/complimentary-access.mjs revoke  --email <email> [--env-file .env.local]

Product (standalone course) commands:
  node scripts/complimentary-access.mjs status-product --email <email> --product ${DEFAULT_PRODUCT_SLUG} [--env-file .env.local]
  node scripts/complimentary-access.mjs grant-product  --email <email> --product ${DEFAULT_PRODUCT_SLUG} [--dry-run] [--env-file .env.local]
  node scripts/complimentary-access.mjs revoke-product --email <email> --product ${DEFAULT_PRODUCT_SLUG} [--env-file .env.local]

Audit reason recorded for grants: "${AUDIT_REASON}"
Product grants use product_entitlements.source='complimentary' — never Stripe orders.
`)
}

async function main() {
  const command = process.argv[2]
  if (!command || command === "--help" || command === "-h") {
    printUsage()
    return
  }

  const email = parseArgValue("--email", "")
  const planSlug = parseArgValue("--plan", DEFAULT_PLAN_SLUG)
  const productSlug = parseArgValue("--product", DEFAULT_PRODUCT_SLUG)
  const dryRun = process.argv.includes("--dry-run")
  const envFilePath = resolve(process.cwd(), parseArgValue("--env-file", ".env.local"))
  const { client, projectRef } = createSupabaseFromEnv(envFilePath)

  if (command === "status") {
    await commandStatus({ client, projectRef, email, planSlug })
    return
  }

  if (command === "grant") {
    await commandGrant({ client, projectRef, email, planSlug, dryRun })
    return
  }

  if (command === "revoke") {
    await commandRevoke({ client, projectRef, email })
    return
  }

  if (command === "status-product") {
    await commandStatusProduct({ client, projectRef, email, productSlug })
    return
  }

  if (command === "grant-product") {
    await commandGrantProduct({ client, projectRef, email, productSlug, dryRun })
    return
  }

  if (command === "revoke-product") {
    await commandRevokeProduct({ client, projectRef, email, productSlug })
    return
  }

  printUsage()
  throw new Error(`Unknown command "${command}"`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
