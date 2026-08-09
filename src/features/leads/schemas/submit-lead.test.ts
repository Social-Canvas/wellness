import assert from "node:assert/strict"
import { test } from "node:test"

import {
  ENQUIRY_HONEYPOT_FIELD,
  isHoneypotTriggered,
  submitLeadSchema,
} from "./submit-lead.ts"

test("submitLeadSchema accepts canonical lead types including nonprofit and contact", () => {
  for (const leadType of [
    "vip",
    "retreat",
    "private_event",
    "free_taster",
    "nonprofit",
    "contact",
  ] as const) {
    const parsed = submitLeadSchema.safeParse({
      leadType,
      name: "Alex Example",
      email: "alex@example.com",
    })
    assert.equal(parsed.success, true)
  }
})

test("submitLeadSchema rejects invalid email and empty name", () => {
  const badEmail = submitLeadSchema.safeParse({
    leadType: "vip",
    name: "Alex",
    email: "not-an-email",
  })
  assert.equal(badEmail.success, false)

  const badName = submitLeadSchema.safeParse({
    leadType: "vip",
    name: "   ",
    email: "alex@example.com",
  })
  assert.equal(badName.success, false)
})

test("honeypot helper detects filled companyUrl", () => {
  assert.equal(isHoneypotTriggered(undefined), false)
  assert.equal(isHoneypotTriggered(null), false)
  assert.equal(isHoneypotTriggered(""), false)
  assert.equal(isHoneypotTriggered("   "), false)
  assert.equal(isHoneypotTriggered("https://spam.example"), true)

  const withHoney = submitLeadSchema.safeParse({
    leadType: "retreat",
    name: "Bot",
    email: "bot@example.com",
    [ENQUIRY_HONEYPOT_FIELD]: "http://spam.test",
  })
  assert.equal(withHoney.success, true)
  if (withHoney.success) {
    assert.equal(isHoneypotTriggered(withHoney.data.companyUrl), true)
  }
})
