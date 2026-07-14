#!/usr/bin/env node

/**
 * Complimentary tester access tooling.
 *
 * Grants (and revokes) a complimentary, non-Stripe membership entitlement for a
 * single account by inserting a clearly-marked complimentary subscription row.
 *
 * Access model (see src/server/services/entitlement.service.ts):
 *   subscriptions (user -> plan) -> content_access (plan -> course) -> course/lesson/video access.
 * Granting a complimentary subscription to a plan therefore unlocks every course
 * mapped to that plan via content_access, plus signed Mux playback for the
 * entitled (ready/published) videos in those courses.
 *
 * This tool deliberately does NOT:
 *   - call any Stripe API (no charges, checkout, invoices, or portal),
 *   - create real-looking Stripe identifiers (all ids are `comp_` prefixed),
 *   - send any email,
 *   - touch Mux, publication state, prices, or product-to-course mappings,
 *   - modify content_access (which would affect other users of a plan),
 *   - create or modify auth users / passwords.
 *
 * The complimentary subscription is idempotent (keyed on a deterministic
 * `stripe_subscription_id`) and fully reversible (`revoke` deletes exactly the
 * rows this tool created).
 *
 * Usage:
 *   node scripts/complimentary-access.mjs status  --email <email> [--plan plan-3] [--env-file .env.local]
 *   node scripts/complimentary-access.mjs grant   --email <email> [--plan plan-3] [--env-file .env.local]
 *   node scripts/complimentary-access.mjs revoke  --email <email> [--env-file .env.local]
 *
 * The tester email is always supplied on the command line — it is never
 * hardcoded here, in the app, middleware, route handlers, RLS, or UI.
 */

import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { createClient } from "@supabase/supabase-js"

const AUDIT_REASON = "complimentary launch testing access"
const COMP_PREFIX = "comp_launch_testing"
const DEFAULT_PLAN_SLUG = "plan-3"
const GRANT_PERIOD_DAYS = 365

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

// The complimentary marker embeds the full profile id
// (`comp_launch_testing_<profileId>`). Keep the marker prefix visible for
// auditability, but never print the raw profile id it contains.
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

  // Case-insensitive, exact email match only.
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
      "id, plan_id, status, stripe_subscription_id, stripe_customer_id, current_period_end, cancel_at_period_end"
    )
    .eq("user_id", profileId)
    .like("stripe_subscription_id", `${COMP_PREFIX}_%`)

  if (error) throw new Error(`Subscription lookup failed: ${error.message}`)
  return data ?? []
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

  // Idempotent upsert keyed on the unique, deterministic complimentary marker.
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

function printUsage() {
  console.log(`Complimentary tester access tooling

Usage:
  node scripts/complimentary-access.mjs status  --email <email> [--plan ${DEFAULT_PLAN_SLUG}] [--env-file .env.local]
  node scripts/complimentary-access.mjs grant   --email <email> [--plan ${DEFAULT_PLAN_SLUG}] [--dry-run] [--env-file .env.local]
  node scripts/complimentary-access.mjs revoke  --email <email> [--env-file .env.local]

Audit reason recorded for grants: "${AUDIT_REASON}"
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

  printUsage()
  throw new Error(`Unknown command "${command}"`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
