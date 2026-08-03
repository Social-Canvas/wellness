import assert from "node:assert/strict"
import { test } from "node:test"

import {
  BRAND_LOGO_HOME_LABEL,
  BRAND_LOGO_LOCKUP_DARK_TEXT,
  BRAND_LOGO_LOCKUP_WHITE_TEXT,
  BRAND_LOGO_MARK,
  getBrandLogoAbsoluteMarkUrl,
  getBrandLogoImageAlt,
  getBrandLogoLockup,
} from "./logo.ts"

test("brand mark points at the square cut asset, not a wide lockup image", () => {
  assert.equal(BRAND_LOGO_MARK.src, "/brand/elevate-mark-square.png")
  assert.ok(BRAND_LOGO_MARK.width > 0)
  assert.ok(BRAND_LOGO_MARK.height > 0)
  assert.equal(BRAND_LOGO_MARK.src.includes("lockup"), false)
  assert.equal(BRAND_LOGO_MARK.src.includes("horizontal"), false)
})

test("lockups expose dark-text and white-text assets", () => {
  assert.equal(
    BRAND_LOGO_LOCKUP_DARK_TEXT.src,
    "/brand/elevate-lockup-dark-text.png"
  )
  assert.equal(
    BRAND_LOGO_LOCKUP_WHITE_TEXT.src,
    "/brand/elevate-lockup-white-text.png"
  )
  assert.equal(getBrandLogoLockup("dark-text").src, BRAND_LOGO_LOCKUP_DARK_TEXT.src)
  assert.equal(
    getBrandLogoLockup("white-text").src,
    BRAND_LOGO_LOCKUP_WHITE_TEXT.src
  )
  assert.equal(getBrandLogoLockup().src, BRAND_LOGO_LOCKUP_DARK_TEXT.src)
})

test("icon variant exposes brand name via image alt", () => {
  assert.equal(getBrandLogoImageAlt("icon"), "Elevate Health Solutions")
})

test("horizontal lockup exposes brand name via image alt", () => {
  assert.equal(getBrandLogoImageAlt("horizontal"), "Elevate Health Solutions")
})

test("home link label names the brand once", () => {
  assert.equal(BRAND_LOGO_HOME_LABEL, "Elevate Health Solutions home")
})

test("absolute mark URL strips trailing slash from app origin", () => {
  assert.equal(
    getBrandLogoAbsoluteMarkUrl("https://example.com/"),
    "https://example.com/brand/elevate-mark-square.png"
  )
  assert.equal(
    getBrandLogoAbsoluteMarkUrl("https://example.com"),
    "https://example.com/brand/elevate-mark-square.png"
  )
})
