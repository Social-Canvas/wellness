import assert from "node:assert/strict"
import test from "node:test"

import {
  isInvalidLeadTypeEnumError,
  isMissingLeadsSchemaError,
} from "./leads-schema-errors.ts"
import {
  buildLegacyLeadInsertPayload,
  buildLegacyLeadTypeFallbackPayload,
  HARDENING_LEAD_INSERT_KEYS,
  insertLeadWithSchemaFallback,
  LEGACY_LEAD_TYPE_FALLBACK,
  resolveLegacyLeadType,
  type LeadInsertRow,
} from "./legacy-lead-insert.ts"

const schemaGuards = {
  isMissingSchemaError: isMissingLeadsSchemaError,
  isInvalidLeadTypeEnum: isInvalidLeadTypeEnumError,
}

function hardenedNonprofitRow(): LeadInsertRow {
  return {
    lead_type: "nonprofit",
    name: "Alex Rivera",
    email: "alex@example.org",
    phone: "+1 555 0100",
    message: "Partnership enquiry",
    source: "nonprofit_partnership",
    metadata: {
      intent: "nonprofit_partnership",
      accessAudience: "employees",
    },
    status: "new",
    organization_name: "Helping Hands",
    estimated_participants: "26-75",
    interest: null,
    notification_status: "pending",
    visitor_ack_status: "pending",
    last_notification_error: null,
  }
}

test("buildLegacyLeadInsertPayload strips hardening columns into metadata", () => {
  const legacy = buildLegacyLeadInsertPayload(hardenedNonprofitRow())

  for (const key of HARDENING_LEAD_INSERT_KEYS) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(legacy, key),
      false,
      `legacy payload must omit ${key}`
    )
  }

  assert.equal(legacy.lead_type, "nonprofit")
  assert.equal(legacy.name, "Alex Rivera")
  assert.equal(legacy.email, "alex@example.org")
  assert.equal(legacy.phone, "+1 555 0100")
  assert.equal(legacy.message, "Partnership enquiry")
  assert.equal(legacy.source, "nonprofit_partnership")

  const metadata = legacy.metadata as Record<string, unknown>
  assert.equal(metadata.organizationName, "Helping Hands")
  assert.equal(metadata.estimatedParticipants, "26-75")
  assert.equal(metadata.intent, "nonprofit_partnership")
  assert.equal(metadata.accessAudience, "employees")
})

test("buildLegacyLeadTypeFallbackPayload remaps nonprofit to private_event metadata", () => {
  const remapped = buildLegacyLeadTypeFallbackPayload(hardenedNonprofitRow())
  assert.equal(remapped.lead_type, LEGACY_LEAD_TYPE_FALLBACK)
  const metadata = remapped.metadata as Record<string, unknown>
  assert.equal(metadata.canonical_type, "nonprofit")
  assert.equal(metadata.enquiry_type, "nonprofit")
  assert.equal(metadata.organizationName, "Helping Hands")
})

test("resolveLegacyLeadType prefers canonical_type metadata", () => {
  assert.equal(
    resolveLegacyLeadType("private_event", {
      canonical_type: "nonprofit",
      enquiry_type: "nonprofit",
    }),
    "nonprofit"
  )
  assert.equal(
    resolveLegacyLeadType("private_event", {
      intent: "nonprofit_partnership",
    }),
    "nonprofit"
  )
  assert.equal(resolveLegacyLeadType("vip", {}), "vip")
})

test("insertLeadWithSchemaFallback retries legacy columns on PGRST204", async () => {
  const calls: LeadInsertRow[] = []
  const result = await insertLeadWithSchemaFallback(
    hardenedNonprofitRow(),
    async (row) => {
      calls.push(row)
      if (calls.length === 1) {
        return {
          data: null,
          error: {
            code: "PGRST204",
            message:
              "Could not find the 'estimated_participants' column of 'leads' in the schema cache",
          },
        }
      }
      return {
        data: { id: "lead-1", created_at: "2026-08-09T12:00:00Z" },
        error: null,
      }
    },
    schemaGuards
  )

  assert.equal(calls.length, 2)
  assert.equal(result.data?.id, "lead-1")
  assert.equal(result.usedLegacyColumns, true)
  assert.equal(result.usedLeadTypeFallback, false)
  assert.equal(
    Object.prototype.hasOwnProperty.call(calls[1], "estimated_participants"),
    false
  )
})

test("insertLeadWithSchemaFallback remaps lead_type after enum rejection", async () => {
  const calls: LeadInsertRow[] = []
  const result = await insertLeadWithSchemaFallback(
    hardenedNonprofitRow(),
    async (row) => {
      calls.push(row)
      if (calls.length === 1) {
        return {
          data: null,
          error: {
            code: "PGRST204",
            message:
              "Could not find the 'estimated_participants' column of 'leads' in the schema cache",
          },
        }
      }
      if (calls.length === 2) {
        return {
          data: null,
          error: {
            code: "22P02",
            message: 'invalid input value for enum lead_type: "nonprofit"',
          },
        }
      }
      return {
        data: { id: "lead-2", created_at: "2026-08-09T12:00:00Z" },
        error: null,
      }
    },
    schemaGuards
  )

  assert.equal(calls.length, 3)
  assert.equal(result.data?.id, "lead-2")
  assert.equal(result.usedLegacyColumns, true)
  assert.equal(result.usedLeadTypeFallback, true)
  assert.equal(calls[2]?.lead_type, "private_event")
  const metadata = calls[2]?.metadata as Record<string, unknown>
  assert.equal(metadata.canonical_type, "nonprofit")
})

test("insertLeadWithSchemaFallback does not succeed when all attempts fail", async () => {
  const result = await insertLeadWithSchemaFallback(
    hardenedNonprofitRow(),
    async () => ({
      data: null,
      error: {
        code: "42501",
        message: "permission denied for table leads",
      },
    }),
    schemaGuards
  )

  assert.equal(result.data, null)
  assert.equal(result.usedLegacyColumns, false)
  assert.equal(result.usedLeadTypeFallback, false)
})

test("vip retreat private_event free_taster legacy payload omits hardening fields", () => {
  for (const leadType of ["vip", "retreat", "private_event", "free_taster"] as const) {
    const legacy = buildLegacyLeadInsertPayload({
      lead_type: leadType,
      name: "Sam",
      email: "sam@example.com",
      status: "new",
      organization_name: null,
      estimated_participants: null,
      interest: "breathwork",
      notification_status: "pending",
      visitor_ack_status: "pending",
      last_notification_error: null,
      metadata: { topic: "demo" },
    })

    for (const key of HARDENING_LEAD_INSERT_KEYS) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(legacy, key),
        false,
        `${leadType} legacy payload must omit ${key}`
      )
    }
    assert.equal(legacy.lead_type, leadType)
    const metadata = legacy.metadata as Record<string, unknown>
    assert.equal(metadata.interest, "breathwork")
    assert.equal(metadata.topic, "demo")
  }
})
