import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..")

function readSrc(rel: string): string {
  return readFileSync(join(root, "src", rel), "utf8")
}

const HOME_TITLE = "Elevate Health Solutions | Dr. Deepa Patani"
const HOME_DESCRIPTION =
  "A root-cause approach to health through functional medicine, holistic healing and personalised solutions designed around you."
const OG_IMAGE_PATH = "/brand/elevate-og-square.jpg"

describe("site SEO constants", () => {
  it("uses the approved homepage title and description verbatim", () => {
    const source = readSrc("lib/seo/site-seo.ts")
    assert.match(source, new RegExp(`homeTitle: "${HOME_TITLE}"`))
    assert.match(source, new RegExp(`homeDescription:\\s+"${HOME_DESCRIPTION}"`))
    assert.match(source, /path: "\/brand\/elevate-og-square\.jpg"/)
    assert.match(source, /width: 1200/)
    assert.match(source, /height: 1200/)
    assert.match(source, /twitterCard: "summary"/)
  })

  it("ships an opaque square social preview asset", () => {
    const imagePath = join(root, "public", OG_IMAGE_PATH.replace(/^\//, ""))
    assert.equal(existsSync(imagePath), true)
    const bytes = readFileSync(imagePath)
    assert.ok(bytes.length > 10_000)
    assert.ok(bytes.length < 400_000)
    assert.equal(bytes[0], 0xff)
    assert.equal(bytes[1], 0xd8)
  })

  it("keeps homepage title absolute so the root template does not suffix it", () => {
    const home = readSrc("app/(public)/page.tsx")
    assert.match(home, /SITE_SEO\.homeTitle/)
    assert.match(home, /SITE_SEO\.homeDescription/)
    assert.match(home, /absoluteTitle: true/)
    assert.match(home, /path: "\/"/)
  })
})

describe("public SEO surfaces", () => {
  it("does not put stale hosts or free-taster into sitemap or robots", () => {
    const sitemap = readSrc("app/sitemap.ts")
    const robots = readSrc("app/robots.ts")
    const home = readSrc("app/(public)/page.tsx")
    const layout = readSrc("app/layout.tsx")

    for (const source of [sitemap, robots, home, layout]) {
      assert.doesNotMatch(source, /wellness-topaz-chi\.vercel\.app/)
      assert.doesNotMatch(source, /elevatehealthsolutions\.com/)
    }

    const seo = readSrc("lib/seo/site-seo.ts")
    assert.match(seo, /wellness-topaz-chi\.vercel\.app/)
    assert.match(seo, /elevatehealthsolutions\.com/)

    assert.match(sitemap, /getPublicMetadataOrigin/)
    assert.doesNotMatch(sitemap, /\/free-taster/)
    assert.match(robots, /\/free-taster/)
    assert.match(robots, /\/admin\//)
    assert.match(robots, /\/dashboard\//)
    assert.match(robots, /sitemap\.xml/)
  })

  it("keeps free-taster noindex and blog articles using their own titles", () => {
    const freeTaster = readSrc("app/(public)/free-taster/page.tsx")
    const article = readSrc("app/(public)/blog/[slug]/page.tsx")
    assert.match(freeTaster, /index: false/)
    assert.match(article, /buildPublicPageMetadata/)
    assert.match(article, /article\.title/)
    assert.match(article, /publishedAt/)
    assert.match(article, /coverImage/)
  })
})

describe("canonical production origin", () => {
  it("is the hyphenated Elevate domain", () => {
    const source = readSrc("lib/seo/site-seo.ts")
    assert.match(
      source,
      /CANONICAL_PRODUCTION_ORIGIN = "https:\/\/elevate-healthsolutions\.com"/
    )
  })
})
