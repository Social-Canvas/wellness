import assert from "node:assert/strict"
import test from "node:test"

import {
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

test("isMissingLeadsSchemaError detects Postgres undefined_column", () => {
  assert.equal(
    isMissingLeadsSchemaError({
      code: "42703",
      message: 'column leads.status does not exist',
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

test("schema not ready message is admin-facing and actionable", () => {
  assert.match(LEADS_SCHEMA_NOT_READY_MESSAGE, /migration not applied/i)
  assert.match(LEADS_SCHEMA_NOT_READY_MESSAGE, /20260809233000/)
})
