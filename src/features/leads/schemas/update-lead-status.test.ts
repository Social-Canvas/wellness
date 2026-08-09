import assert from "node:assert/strict"
import test from "node:test"

import { updateLeadStatusSchema } from "./update-lead-status.ts"
import {
  ADMIN_LEAD_STATUS_FILTERS,
  ADMIN_LEAD_TYPE_FILTERS,
  formatLeadTypeLabel,
  previewLeadMessage,
} from "../utils/lead-labels.ts"

test("updateLeadStatusSchema accepts canonical statuses", () => {
  const parsed = updateLeadStatusSchema.safeParse({
    leadId: "11111111-1111-4111-8111-111111111111",
    status: "contacted",
  })
  assert.equal(parsed.success, true)
})

test("updateLeadStatusSchema rejects invalid status", () => {
  const parsed = updateLeadStatusSchema.safeParse({
    leadId: "11111111-1111-4111-8111-111111111111",
    status: "archived",
  })
  assert.equal(parsed.success, false)
})

test("admin type filters include free_taster and exclude contact chip", () => {
  const values = ADMIN_LEAD_TYPE_FILTERS.map((item) => item.value)
  assert.ok(values.includes("free_taster"))
  assert.ok(values.includes("retreat"))
  assert.ok(values.includes("nonprofit"))
  assert.ok(values.includes("vip"))
  assert.ok(values.includes("private_event"))
  assert.equal(values.includes("contact" as never), false)
})

test("admin status filters cover workflow states", () => {
  const values = ADMIN_LEAD_STATUS_FILTERS.map((item) => item.value)
  assert.deepEqual(values, [
    "all",
    "new",
    "contacted",
    "qualified",
    "closed",
  ])
})

test("lead labels and message preview helpers", () => {
  assert.equal(formatLeadTypeLabel("private_event"), "Private Event")
  assert.equal(previewLeadMessage(null), "—")
  assert.equal(previewLeadMessage("Short note"), "Short note")
  assert.equal(
    previewLeadMessage("a".repeat(100), 20).endsWith("…"),
    true
  )
})
