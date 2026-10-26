/**
 * READ-ONLY production bot/test audit. Never writes.
 *
 * Usage:
 *   node --env-file=.env.local scripts/bot-audit-dry-run.mjs
 *
 * Prints aggregated classification. Redacts emails except test domains
 * and obviously fake/test local-part prefixes. Does not print API keys.
 */
import { createHash } from "node:crypto"
import { mkdirSync, writeFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const TEST_DOMAINS = new Set(["example.com", "test.com", "mailinator.com"])
const EXACT_TEST_EMAILS = new Set([
  "e2e@elevate-healthsolutions.com",
  "smoke@elevate-healthsolutions.com",
  "playwright@elevate-healthsolutions.com",
])
const TEST_LOCAL_PREFIXES = [
  "e2e-",
  "smoke-",
  "test-",
  "browser-",
  "verify-",
  "imp-",
  "raw-",
]
const OPERATOR_EMAILS = new Set([
  "ritika.bizz@gmail.com",
  "elevate.ritika@gmail.com",
])

function hashId(value) {
  return createHash("sha256").update(String(value).toLowerCase()).digest("hex").slice(0, 10)
}

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase()
}

function localAndDomain(email) {
  const normalized = normalizeEmail(email)
  const at = normalized.lastIndexOf("@")
  if (at < 0) {
    return { local: normalized, domain: "" }
  }
  return { local: normalized.slice(0, at), domain: normalized.slice(at + 1) }
}

function redactEmail(email) {
  const normalized = normalizeEmail(email)
  const { local, domain } = localAndDomain(normalized)
  if (TEST_DOMAINS.has(domain) || EXACT_TEST_EMAILS.has(normalized)) {
    return normalized
  }
  if (TEST_LOCAL_PREFIXES.some((prefix) => local.startsWith(prefix))) {
    return `${local.slice(0, Math.min(local.length, 12))}…@${domain}`
  }
  if (/^(test|e2e|smoke|playwright|dummy|fake)/i.test(local)) {
    return `${local.slice(0, Math.min(local.length, 12))}…@${domain}`
  }
  const localHint =
    local.length <= 2 ? `${local[0] ?? "?"}*` : `${local[0]}***${local.slice(-1)}`
  return `${localHint}@${domain || "unknown"}#${hashId(normalized)}`
}

function redactName(name) {
  const trimmed = String(name ?? "").trim()
  if (!trimmed) return null
  if (/^(test|asdf|qwerty|foo|bar|xxx|aaa|dummy|fake|user|admin)\b/i.test(trimmed)) {
    return trimmed
  }
  const parts = trimmed.split(/\s+/)
  return parts
    .map((part) => (part.length <= 1 ? "*" : `${part[0]}***`))
    .join(" ")
}

function looksLikeGeneratedLocal(local) {
  if (!local) return false
  if (/^[a-z]{10,20}\d{0,4}$/.test(local) && !/[aeiou]{2}/.test(local)) {
    return true
  }
  if (/^[a-z0-9]{16,}$/.test(local)) return true
  if (/^(user|name|asdf|qwer|zxcv|qazwsx)\d{2,}$/.test(local)) return true
  return false
}

function looksLikeNonsenseName(name) {
  const trimmed = String(name ?? "").trim()
  if (!trimmed) return false
  const compact = trimmed.replace(/\s+/g, "")
  if (/^(.)\1{3,}$/i.test(compact)) return true
  if (/^(asdf|qwer|zxcv|qwerty|testtest|abcabc|xxx|asdfgh|lorem)/i.test(compact)) {
    return true
  }
  if (compact.length >= 8 && !/[aeiou]/i.test(compact) && /^[a-z]+$/i.test(compact)) {
    return true
  }
  if (/^[^a-zA-Z]*$/.test(trimmed)) return true
  return false
}

function looksLikeImpossiblePhone(phone) {
  if (!phone) return false
  const digits = String(phone).replace(/\D/g, "")
  if (digits.length > 0 && digits.length < 7) return true
  if (/^0+$/.test(digits) || /^1+$/.test(digits) || /^123456/.test(digits)) return true
  if (/^(\d)\1{6,}$/.test(digits)) return true
  return false
}

function messageHasUrl(message) {
  return /https?:\/\/|www\./i.test(String(message ?? ""))
}

function looksLikeGibberishMessage(message) {
  const text = String(message ?? "").trim()
  if (!text) return false
  if (text.length >= 40 && !/\s/.test(text) && /[a-z]{20,}/i.test(text)) return true
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length >= 6) {
    const nonsense = words.filter((word) => word.length >= 8 && !/[aeiou]/i.test(word))
    if (nonsense.length / words.length >= 0.5) return true
  }
  return false
}

function isGeneratedAlphanumericToken(value) {
  const trimmed = String(value ?? "").trim()
  return /^[A-Za-z0-9]{10}$/.test(trimmed) && /\d/.test(trimmed)
}

function extractUserTypedEnquiryBody(message) {
  const lines = String(message ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const body = []
  for (const line of lines) {
    const prefixed = /^message\s*:\s*(.*)$/i.exec(line)
    if (prefixed) {
      if (prefixed[1]?.trim()) body.push(prefixed[1].trim())
      continue
    }
    if (
      /^(interest|location|preferred timing|number of attendees)\s*:/i.test(line)
    ) {
      continue
    }
    body.push(line)
  }
  return body.join("\n").trim()
}

function extractEnquiryLocation(message) {
  return /^location\s*:\s*(.+)$/im.exec(String(message ?? ""))?.[1]?.trim() ?? ""
}

function isGeneratedJunkBody(value) {
  const trimmed = String(value ?? "").trim()
  return (
    trimmed.length >= 53 &&
    trimmed.length <= 57 &&
    /^[A-Za-z0-9]+$/.test(trimmed) &&
    /[A-Za-z]/.test(trimmed) &&
    /\d/.test(trimmed)
  )
}

function retreatSpamFingerprint(input) {
  const reasons = []
  const location = extractEnquiryLocation(input.message)
  const body = extractUserTypedEnquiryBody(input.message)
  if (isGeneratedAlphanumericToken(input.name)) reasons.push("generated_name")
  if (isGeneratedAlphanumericToken(location)) reasons.push("generated_location")
  if (isGeneratedJunkBody(body)) reasons.push("generated_message_body")
  return reasons
}

function isInternalTestEmail(email) {
  const normalized = normalizeEmail(email)
  const { local, domain } = localAndDomain(normalized)
  if (TEST_DOMAINS.has(domain)) return true
  if (EXACT_TEST_EMAILS.has(normalized)) return true
  if (TEST_LOCAL_PREFIXES.some((prefix) => local.startsWith(prefix))) return true
  if (domain === "elevate-healthsolutions.com" && /^(e2e|smoke|playwright|test)/.test(local)) {
    return true
  }
  return false
}

function bucketMinute(iso) {
  if (!iso) return "unknown"
  return iso.slice(0, 16)
}

async function fetchAll(table, columns) {
  const pageSize = 1000
  const rows = []
  let from = 0
  while (true) {
    const { data, error } = await sb
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1)
    if (error) {
      return { error: error.message, rows }
    }
    const batch = data ?? []
    rows.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }
  return { rows }
}

async function fetchAuthUsers() {
  const users = []
  let page = 1
  const perPage = 200
  while (true) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage })
    if (error) {
      return { error: error.message, users }
    }
    const batch = data?.users ?? []
    users.push(...batch)
    if (batch.length < perPage) break
    page += 1
    if (page > 50) break
  }
  return { users }
}

function classifyAccount(input) {
  const reasons = []
  let bucket = "D"
  const email = normalizeEmail(input.email)

  if (OPERATOR_EMAILS.has(email) || input.role === "admin" || input.role === "super_admin") {
    return {
      class: "C",
      reasons: ["operator_or_admin"],
      internalTest: false,
      highConfidence: false,
    }
  }

  if (isInternalTestEmail(email)) {
    reasons.push("internal_test_email")
    return { class: "A", reasons, internalTest: true, highConfidence: true }
  }

  if (looksLikeGeneratedLocal(localAndDomain(email).local)) {
    reasons.push("generated_looking_email_local")
    bucket = "B"
  }
  if (looksLikeNonsenseName(input.fullName) || looksLikeNonsenseName(input.certificateName)) {
    reasons.push("nonsense_name")
    bucket = "B"
  }
  if (input.burstSize >= 8) {
    reasons.push("signup_burst")
    bucket = "B"
  }
  if (input.repeatNameCount >= 8 && input.fullName) {
    reasons.push("repeated_full_name")
    bucket = "B"
  }
  if (input.repeatCertNameCount >= 8 && input.certificateName) {
    reasons.push("repeated_certificate_name")
    bucket = "B"
  }

  const neverConfirmed = input.emailConfirmed === false
  const neverSignedIn = !input.lastSignInAt
  const noActivity = !input.hasActivity

  // Never treat inactivity alone as bot.
  if (
    neverConfirmed &&
    (looksLikeGeneratedLocal(localAndDomain(email).local) || looksLikeNonsenseName(input.fullName)) &&
    input.burstSize >= 5
  ) {
    reasons.push("unconfirmed_generated_in_burst")
    return { class: "A", reasons, internalTest: false, highConfidence: true }
  }

  if (neverConfirmed && noActivity && neverSignedIn && bucket === "B") {
    reasons.push("unconfirmed_no_activity_plus_heuristic")
    return { class: "B", reasons, internalTest: false, highConfidence: false }
  }

  if (reasons.length === 0) {
    if (neverConfirmed && noActivity && neverSignedIn) {
      return {
        class: "D",
        reasons: ["unconfirmed_or_inactive_only_not_sufficient"],
        internalTest: false,
        highConfidence: false,
      }
    }
    return { class: "C", reasons: ["no_bot_markers"], internalTest: false, highConfidence: false }
  }

  return { class: bucket, reasons, internalTest: false, highConfidence: false }
}

function classifyLead(input) {
  const reasons = []
  const email = normalizeEmail(input.email)

  if (isInternalTestEmail(email) || /^e2e-|smoke-|test-/i.test(String(input.name ?? ""))) {
    return {
      class: "A",
      reasons: ["internal_test_lead"],
      internalTest: true,
      highConfidence: true,
    }
  }

  const fingerprint = retreatSpamFingerprint(input)
  if (fingerprint.length > 0) {
    return {
      class: "A",
      reasons: fingerprint,
      internalTest: false,
      highConfidence: true,
    }
  }

  if (input.identicalMessageCount >= 5 && input.message) {
    reasons.push("identical_message_cluster")
  }
  if (messageHasUrl(input.message)) reasons.push("url_in_message")
  if (looksLikeGibberishMessage(input.message)) reasons.push("gibberish_message")
  if (looksLikeNonsenseName(input.name)) reasons.push("nonsense_name")
  if (looksLikeImpossiblePhone(input.phone)) reasons.push("impossible_phone")
  if (input.repeatEmailCount >= 4) reasons.push("repeated_email")
  if (input.repeatNameCount >= 5) reasons.push("repeated_name")
  if (input.burstSize >= 5) reasons.push("rapid_repeat_window")
  if (looksLikeGeneratedLocal(localAndDomain(email).local)) {
    reasons.push("generated_looking_email_local")
  }

  const high =
    (input.identicalMessageCount >= 5 && messageHasUrl(input.message)) ||
    (input.repeatEmailCount >= 6 && input.burstSize >= 5) ||
    (looksLikeGibberishMessage(input.message) && messageHasUrl(input.message))

  if (high) {
    return { class: "A", reasons, internalTest: false, highConfidence: true }
  }
  if (reasons.length >= 2) {
    return { class: "B", reasons, internalTest: false, highConfidence: false }
  }
  if (reasons.length === 1) {
    return { class: "B", reasons, internalTest: false, highConfidence: false }
  }
  if (!input.message && !input.phone) {
    return {
      class: "D",
      reasons: ["sparse_fields"],
      internalTest: false,
      highConfidence: false,
    }
  }
  return { class: "C", reasons: ["no_bot_markers"], internalTest: false, highConfidence: false }
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1)
}

function topEntries(map, limit = 8) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }))
}

async function main() {
  const [
    profilesRes,
    leadsRes,
    ordersRes,
    subsRes,
    progressRes,
    entitlementsRes,
    certsRes,
    liveRegsRes,
    authRes,
  ] = await Promise.all([
    fetchAll(
      "profiles",
      "id, auth_user_id, email, full_name, certificate_name, role, created_at, updated_at, stripe_customer_id, phone"
    ),
    fetchAll(
      "leads",
      "id, email, name, phone, message, lead_type, source, status, created_at"
    ),
    fetchAll("orders", "id, user_id, status, amount_paid, created_at"),
    fetchAll("subscriptions", "id, user_id, status, access_source, created_at"),
    fetchAll("video_progress", "user_id"),
    fetchAll("product_entitlements", "user_id"),
    fetchAll("certificates", "user_id"),
    fetchAll("live_session_registrations", "user_id"),
    fetchAuthUsers(),
  ])

  const errors = {}
  if (profilesRes.error) errors.profiles = profilesRes.error
  if (leadsRes.error) errors.leads = leadsRes.error
  if (ordersRes.error) errors.orders = ordersRes.error
  if (subsRes.error) errors.subscriptions = subsRes.error
  if (progressRes.error) errors.video_progress = progressRes.error
  if (entitlementsRes.error) errors.product_entitlements = entitlementsRes.error
  if (certsRes.error) errors.certificates = certsRes.error
  if (liveRegsRes.error) errors.live_session_registrations = liveRegsRes.error
  if (authRes.error) errors.auth_users = authRes.error

  const profiles = profilesRes.rows
  const leads = leadsRes.rows
  const authById = new Map((authRes.users ?? []).map((user) => [user.id, user]))

  const activityIds = new Set()
  for (const row of ordersRes.rows) activityIds.add(row.user_id)
  for (const row of subsRes.rows) activityIds.add(row.user_id)
  for (const row of progressRes.rows) activityIds.add(row.user_id)
  for (const row of entitlementsRes.rows) activityIds.add(row.user_id)
  for (const row of certsRes.rows) activityIds.add(row.user_id)
  for (const row of liveRegsRes.rows) activityIds.add(row.user_id)

  const paidOrderUserIds = new Set(
    ordersRes.rows
      .filter((row) => row.status === "paid" && Number(row.amount_paid) > 0)
      .map((row) => row.user_id)
  )

  const nameCounts = new Map()
  const certNameCounts = new Map()
  const minuteCounts = new Map()
  for (const profile of profiles) {
    const name = String(profile.full_name ?? "").trim().toLowerCase()
    if (name) increment(nameCounts, name)
    const cert = String(profile.certificate_name ?? "").trim().toLowerCase()
    if (cert) increment(certNameCounts, cert)
    increment(minuteCounts, bucketMinute(profile.created_at))
  }

  const domainCounts = new Map()
  const accountClasses = { A: 0, B: 0, C: 0, D: 0 }
  const accountInternalA = []
  const accountExternalA = []
  const accountB = []
  const reasonCounts = new Map()
  let confirmed = 0
  let unconfirmed = 0
  let confirmationUnknown = 0
  let neverSignedIn = 0
  let withActivity = 0
  let operatorFound = []

  for (const profile of profiles) {
    const email = normalizeEmail(profile.email)
    if (OPERATOR_EMAILS.has(email)) {
      operatorFound.push({
        email,
        role: profile.role,
        id: profile.id,
      })
    }
    const { domain } = localAndDomain(email)
    increment(domainCounts, domain || "none")
    const authUser = authById.get(profile.auth_user_id)
    const emailConfirmed = authUser
      ? Boolean(authUser.email_confirmed_at)
      : null
    if (emailConfirmed === true) confirmed += 1
    else if (emailConfirmed === false) unconfirmed += 1
    else confirmationUnknown += 1
    if (authUser && !authUser.last_sign_in_at) neverSignedIn += 1
    const hasActivity = activityIds.has(profile.id)
    if (hasActivity) withActivity += 1

    const result = classifyAccount({
      email,
      fullName: profile.full_name,
      certificateName: profile.certificate_name,
      role: profile.role,
      emailConfirmed,
      lastSignInAt: authUser?.last_sign_in_at ?? null,
      hasActivity,
      burstSize: minuteCounts.get(bucketMinute(profile.created_at)) ?? 1,
      repeatNameCount: nameCounts.get(String(profile.full_name ?? "").trim().toLowerCase()) ?? 0,
      repeatCertNameCount:
        certNameCounts.get(String(profile.certificate_name ?? "").trim().toLowerCase()) ?? 0,
    })
    accountClasses[result.class] += 1
    for (const reason of result.reasons) increment(reasonCounts, reason)
    const sample = {
      id: profile.id,
      email: redactEmail(email),
      name: redactName(profile.full_name),
      role: profile.role,
      createdAt: profile.created_at,
      emailConfirmed,
      lastSignInAt: authUser?.last_sign_in_at ?? null,
      hasActivity,
      hasPaidOrder: paidOrderUserIds.has(profile.id),
      reasons: result.reasons,
      internalTest: result.internalTest,
    }
    if (result.class === "A" && result.internalTest && accountInternalA.length < 8) {
      accountInternalA.push(sample)
    } else if (result.class === "A" && !result.internalTest && accountExternalA.length < 8) {
      accountExternalA.push(sample)
    } else if (result.class === "B" && accountB.length < 8) {
      accountB.push(sample)
    }
  }

  const leadEmailCounts = new Map()
  const leadNameCounts = new Map()
  const leadMessageCounts = new Map()
  const leadMinuteCounts = new Map()
  for (const lead of leads) {
    increment(leadEmailCounts, normalizeEmail(lead.email))
    increment(leadNameCounts, String(lead.name ?? "").trim().toLowerCase())
    const msg = String(lead.message ?? "").trim().toLowerCase()
    if (msg) increment(leadMessageCounts, msg)
    increment(leadMinuteCounts, bucketMinute(lead.created_at))
  }

  const leadClasses = { A: 0, B: 0, C: 0, D: 0 }
  const leadInternalA = []
  const leadExternalA = []
  const leadB = []
  const leadReasonCounts = new Map()
  const leadTypeCounts = new Map()
  const leadSources = new Map()

  for (const lead of leads) {
    increment(leadTypeCounts, lead.lead_type ?? "unknown")
    increment(leadSources, lead.source ?? "none")
    const msg = String(lead.message ?? "").trim().toLowerCase()
    const result = classifyLead({
      email: lead.email,
      name: lead.name,
      phone: lead.phone,
      message: lead.message,
      identicalMessageCount: msg ? leadMessageCounts.get(msg) ?? 1 : 0,
      repeatEmailCount: leadEmailCounts.get(normalizeEmail(lead.email)) ?? 1,
      repeatNameCount: leadNameCounts.get(String(lead.name ?? "").trim().toLowerCase()) ?? 0,
      burstSize: leadMinuteCounts.get(bucketMinute(lead.created_at)) ?? 1,
    })
    leadClasses[result.class] += 1
    for (const reason of result.reasons) increment(leadReasonCounts, reason)
    const sample = {
      id: lead.id,
      email: redactEmail(lead.email),
      name: redactName(lead.name),
      leadType: lead.lead_type,
      source: lead.source,
      createdAt: lead.created_at,
      messageLen: String(lead.message ?? "").length,
      hasUrl: messageHasUrl(lead.message),
      reasons: result.reasons,
      internalTest: result.internalTest,
    }
    if (result.class === "A" && result.internalTest && leadInternalA.length < 8) {
      leadInternalA.push(sample)
    } else if (result.class === "A" && !result.internalTest && leadExternalA.length < 8) {
      leadExternalA.push(sample)
    } else if (result.class === "B" && leadB.length < 8) {
      leadB.push(sample)
    }
  }

  const totalAccounts = profiles.length
  const totalLeads = leads.length
  const pct = (count, total) =>
    total === 0 ? 0 : Math.round((count / total) * 1000) / 10

  const largestAccountBurst = topEntries(minuteCounts, 5)
  const largestLeadBurst = topEntries(leadMinuteCounts, 5)
  const topDuplicateMessages = topEntries(leadMessageCounts, 5).map((row) => ({
    count: row.count,
    length: row.key.length,
    hasUrl: messageHasUrl(row.key),
    preview: row.key.slice(0, 40).replace(/[a-z0-9._%+-]+@[a-z0-9.-]+/gi, "[email]"),
  }))

  let verdict = "INSUFFICIENT DATA"
  const internalAccountCount = profiles.filter((p) => isInternalTestEmail(p.email)).length
  const highConfidenceExternalAccounts = accountClasses.A - internalAccountCount
  const internalLeadCount = leads.filter(
    (lead) =>
      isInternalTestEmail(lead.email) || /^e2e-|smoke-|test-/i.test(String(lead.name ?? ""))
  ).length
  const highConfidenceExternalLeads = leadClasses.A - internalLeadCount

  if (totalAccounts === 0 && totalLeads === 0) {
    verdict = "INSUFFICIENT DATA"
  } else if (
    highConfidenceExternalAccounts >= 30 ||
    highConfidenceExternalLeads >= 15 ||
    (totalLeads > 0 && highConfidenceExternalLeads / totalLeads >= 0.4)
  ) {
    verdict = "BOT PROBLEM CONFIRMED"
  } else if (
    highConfidenceExternalAccounts >= 5 ||
    highConfidenceExternalLeads >= 3 ||
    leadClasses.B + Math.max(0, highConfidenceExternalLeads) >= Math.max(8, totalLeads * 0.25)
  ) {
    verdict = "BOT PROBLEM PARTIALLY CONFIRMED"
  } else {
    verdict = "NO STRONG EVIDENCE OF LARGE-SCALE BOT ACTIVITY"
  }

  const report = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    wroteProduction: false,
    ipUaStored: false,
    authUsersFetched: authRes.users?.length ?? 0,
    errors,
    verdict,
    accounts: {
      total: totalAccounts,
      classes: {
        A: { count: accountClasses.A, pct: pct(accountClasses.A, totalAccounts) },
        B: { count: accountClasses.B, pct: pct(accountClasses.B, totalAccounts) },
        C: { count: accountClasses.C, pct: pct(accountClasses.C, totalAccounts) },
        D: { count: accountClasses.D, pct: pct(accountClasses.D, totalAccounts) },
      },
      internalTestHighConfidence: internalAccountCount,
      externalHighConfidence: Math.max(0, highConfidenceExternalAccounts),
      confirmed,
      unconfirmed,
      confirmationUnknown,
      neverSignedIn,
      withActivity,
      paidOrderUsers: paidOrderUserIds.size,
      topDomains: topEntries(domainCounts, 12),
      largestSignupBursts: largestAccountBurst,
      reasonCounts: Object.fromEntries(reasonCounts),
      samples: {
        internalTest: accountInternalA,
        externalHighConfidence: accountExternalA,
        suspicious: accountB,
      },
    },
    leads: {
      total: totalLeads,
      classes: {
        A: { count: leadClasses.A, pct: pct(leadClasses.A, totalLeads) },
        B: { count: leadClasses.B, pct: pct(leadClasses.B, totalLeads) },
        C: { count: leadClasses.C, pct: pct(leadClasses.C, totalLeads) },
        D: { count: leadClasses.D, pct: pct(leadClasses.D, totalLeads) },
      },
      internalTestHighConfidence: internalLeadCount,
      externalHighConfidence: Math.max(0, highConfidenceExternalLeads),
      byType: Object.fromEntries(leadTypeCounts),
      bySource: Object.fromEntries(leadSources),
      largestBursts: largestLeadBurst,
      topDuplicateMessages,
      reasonCounts: Object.fromEntries(leadReasonCounts),
      samples: {
        internalTest: leadInternalA,
        externalHighConfidence: leadExternalA,
        suspicious: leadB,
      },
    },
    operators: operatorFound,
    notes: [
      "Activity absence was never used as the sole bot classifier.",
      "Gmail/Yahoo, unusual names, incomplete profiles, and never-purchased were not sufficient.",
      "IP and user-agent are not stored on profiles or leads.",
      "Auth confirmation state comes from auth.admin.listUsers when accessible.",
    ],
  }

  mkdirSync(".local", { recursive: true })
  writeFileSync(".local/bot-audit-report.json", JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
}

await main()
