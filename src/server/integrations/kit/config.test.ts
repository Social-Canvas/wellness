import assert from "node:assert/strict"
import { afterEach, test } from "node:test"

import {
  canPerformKitWrite,
  getKitConfig,
  getKitWriteBlockReason,
} from "./kit.pure.ts"

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

test("KIT_SYNC_ENABLED defaults to false", () => {
  delete process.env.KIT_SYNC_ENABLED
  delete process.env.KIT_API_KEY
  process.env.NODE_ENV = "development"

  const config = getKitConfig()
  assert.equal(config.syncEnabled, false)
  assert.equal(canPerformKitWrite(config), false)
  assert.equal(getKitWriteBlockReason(config), "sync_disabled")
})

test("test environment blocks Kit writes even when sync is enabled", () => {
  process.env.KIT_SYNC_ENABLED = "true"
  process.env.KIT_API_KEY = "kit_test_key"
  process.env.NODE_ENV = "test"

  const config = getKitConfig()
  assert.equal(config.isTestEnvironment, true)
  assert.equal(canPerformKitWrite(config), false)
  assert.equal(getKitWriteBlockReason(config), "test_environment")
})

test("CI environment blocks Kit writes", () => {
  process.env.KIT_SYNC_ENABLED = "true"
  process.env.KIT_API_KEY = "kit_test_key"
  process.env.NODE_ENV = "production"
  process.env.CI = "true"

  const config = getKitConfig()
  assert.equal(canPerformKitWrite(config), false)
  assert.equal(getKitWriteBlockReason(config), "test_environment")
})

test("production sync requires API key", () => {
  process.env.KIT_SYNC_ENABLED = "true"
  delete process.env.KIT_API_KEY
  process.env.NODE_ENV = "production"
  delete process.env.CI

  const config = getKitConfig()
  assert.equal(canPerformKitWrite(config), false)
  assert.equal(getKitWriteBlockReason(config), "missing_api_key")
})

test("production sync enabled with API key allows writes outside test/CI", () => {
  process.env.KIT_SYNC_ENABLED = "true"
  process.env.KIT_API_KEY = "kit_live_example"
  process.env.KIT_NEWSLETTER_FORM_ID = "9811927"
  process.env.NODE_ENV = "production"
  delete process.env.CI

  const config = getKitConfig()
  assert.equal(canPerformKitWrite(config), true)
  assert.equal(getKitWriteBlockReason(config), null)
  assert.equal(config.newsletterFormId, 9811927)
})

test("invalid newsletter form id is ignored", () => {
  process.env.KIT_NEWSLETTER_FORM_ID = "not-a-number"
  const config = getKitConfig()
  assert.equal(config.newsletterFormId, null)
})
