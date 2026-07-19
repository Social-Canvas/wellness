import assert from "node:assert/strict"
import { test } from "node:test"

import {
  BRAND_LOGO_HOME_LABEL,
  BRAND_LOGO_MARK,
  getBrandLogoAbsoluteMarkUrl,
  getBrandLogoImageAlt,
} from "./logo.ts"

test("brand mark points at the square asset, not a wide lockup image", () => {
  assert.equal(BRAND_LOGO_MARK.src, "/brand/elevate-logo-mark.png")
  assert.ok(BRAND_LOGO_MARK.width > 0)
  assert.ok(BRAND_LOGO_MARK.height > 0)
  assert.equal(BRAND_LOGO_MARK.src.includes("horizontal"), false)
})

test("icon variant exposes brand name via image alt", () => {
  assert.equal(getBrandLogoImageAlt("icon"), "Elevate Health Solutions")
})

test("horizontal variant keeps the mark decorative", () => {
  assert.equal(getBrandLogoImageAlt("horizontal"), "")
})

test("home link label names the brand once", () => {
  assert.equal(BRAND_LOGO_HOME_LABEL, "Elevate Health Solutions home")
})

test("absolute mark URL strips trailing slash from app origin", () => {
  assert.equal(
    getBrandLogoAbsoluteMarkUrl("https://example.com/"),
    "https://example.com/brand/elevate-logo-mark.png"
  )
  assert.equal(
    getBrandLogoAbsoluteMarkUrl("https://example.com"),
    "https://example.com/brand/elevate-logo-mark.png"
  )
})
