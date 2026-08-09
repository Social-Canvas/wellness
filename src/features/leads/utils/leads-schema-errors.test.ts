import assert from "node:assert/strict"
import test from "node:test"

import {
  isInvalidLeadTypeEnumError,
  isMissingLeadsSchemaError,
  LEADS_SCHEMA_NOT_READY_MESSAGE,
} from "./leads-schema-errors.ts"

test("isMissingLeadsSchemaError detects PostgREST missing column code", () => {
  assert.equal(
    isMissingLeadsSchemaError({
      code: "PGRST204",
      message: "Could not find the 'status' column of 'leads' in the schema cache",
    }),
    true
  )
})

test("isMissingLeadsSchemaError detects estimated_participants schema cache miss", () => {
  assert.equal(
    isMissingLeadsSchemaError({
      code: "PGRST204",
      message:
        "Could not find the 'estimated_participants' column of 'leads' in the schema cache",
    }),
    true
  )
})

test("isMissingLeadsSchemaError detects Postgres undefined_column", () => {
  assert.equal(
    isMissingLeadsSchemaError({
      code: "42703",
      message: "column leads.status does not exist",
    }),
    true
  )
})

test("isMissingLeadsSchemaError ignores unrelated provider errors", () => {
  assert.equal(
    isMissingLeadsSchemaError({
      code: "42501",
      message: "permission denied for table leads",
    }),
    false
  )
  assert.equal(
    isMissingLeadsSchemaError({
      code: "",
      message: "",
    }),
    false
  )
})

test("isInvalidLeadTypeEnumError detects Postgres enum rejection for nonprofit", () => {
  assert.equal(
    isInvalidLeadTypeEnumError({
      code: "22P02",
      message: 'invalid input value for enum lead_type: "nonprofit"',
    }),
    true
  )
})

test("isInvalidLeadTypeEnumError detects contact enum rejection", () => {
  assert.equal(
    isInvalidLeadTypeEnumError({
      code: "22P02",
      message: 'invalid input value for enum lead_type: "contact"',
    }),
    true
  )
})

test("isInvalidLeadTypeEnumError ignores unrelated enum errors", () => {
  assert.equal(
    isInvalidLeadTypeEnumError({
      code: "22P02",
      message: 'invalid input value for enum ghl_sync_status: "bogus"',
    }),
    false
  )
})

test("schema not ready message is admin-facing and actionable", () => {
  assert.match(LEADS_SCHEMA_NOT_READY_MESSAGE, /migration not applied/i)
  assert.match(LEADS_SCHEMA_NOT_READY_MESSAGE, /20260809233000/)
})
