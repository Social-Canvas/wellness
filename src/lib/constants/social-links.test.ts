import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { describe, test } from "node:test"
import { fileURLToPath } from "node:url"

import {
  ELEVATE_SOCIAL_URLS,
  PUBLIC_FACEBOOK_GROUP_LINK,
  PUBLIC_FACEBOOK_GROUP_LINK_CLASSNAME,
  PUBLIC_SOCIAL_LINK_CLASSNAME,
  PUBLIC_SOCIAL_PROFILE_LINKS,
  SOCIAL_EXTERNAL_LINK_REL,
} from "./social-links.ts"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..")

function readRepo(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8")
}

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (
      entry === "node_modules" ||
      entry === ".git" ||
      entry === ".next" ||
      entry === "coverage"
    ) {
      continue
    }
    const full = path.join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      collectSourceFiles(full, out)
      continue
    }
    if (/\.(ts|tsx|js|jsx|md|html|css)$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

describe("official Elevate social links", () => {
  test("canonical URLs match approved destinations", () => {
    assert.equal(
      ELEVATE_SOCIAL_URLS.instagram,
      "https://www.instagram.com/elevatewithdrdeepa"
    )
    assert.equal(
      ELEVATE_SOCIAL_URLS.facebook,
      "https://www.facebook.com/deepa.pattani"
    )
    assert.equal(
      ELEVATE_SOCIAL_URLS.linkedin,
      "https://www.linkedin.com/in/dr-deepa-pattani-certified-functional-med-specialist-06426988/"
    )
    assert.equal(
      ELEVATE_SOCIAL_URLS.facebookGroup,
      "https://www.facebook.com/groups/preautoimmune"
    )
  })

  test("profile and group links reuse the canonical URL map", () => {
    const byNetwork = Object.fromEntries(
      PUBLIC_SOCIAL_PROFILE_LINKS.map((link) => [link.network, link.href])
    )
    assert.equal(byNetwork.instagram, ELEVATE_SOCIAL_URLS.instagram)
    assert.equal(byNetwork.facebook, ELEVATE_SOCIAL_URLS.facebook)
    assert.equal(byNetwork.linkedin, ELEVATE_SOCIAL_URLS.linkedin)
    assert.equal(PUBLIC_FACEBOOK_GROUP_LINK.href, ELEVATE_SOCIAL_URLS.facebookGroup)
  })

  test("external social links use noopener noreferrer and open in a new tab", () => {
    for (const link of PUBLIC_SOCIAL_PROFILE_LINKS) {
      assert.equal(link.target, "_blank")
      assert.equal(link.rel, SOCIAL_EXTERNAL_LINK_REL)
      assert.equal(link.rel, "noopener noreferrer")
    }
    assert.equal(PUBLIC_FACEBOOK_GROUP_LINK.target, "_blank")
    assert.equal(PUBLIC_FACEBOOK_GROUP_LINK.rel, "noopener noreferrer")
  })

  test("profile links expose accessible names", () => {
    assert.deepEqual(
      PUBLIC_SOCIAL_PROFILE_LINKS.map((link) => link.ariaLabel),
      [
        "Follow Elevate on Instagram",
        "Follow Dr. Deepa Pattani on Facebook",
        "Connect with Dr. Deepa Pattani on LinkedIn",
      ]
    )
  })

  test("Facebook Group is labeled as a community destination", () => {
    assert.equal(PUBLIC_FACEBOOK_GROUP_LINK.label, "Join our Facebook community")
    assert.equal(
      PUBLIC_FACEBOOK_GROUP_LINK.ariaLabel,
      "Join Healing Auto-immune and Pre Auto-Immune Naturally on Facebook"
    )
    assert.equal(
      PUBLIC_FACEBOOK_GROUP_LINK.description,
      "Healing Auto-immune and Pre Auto-Immune Naturally"
    )
  })

  test("Instagram URL has no igsh tracking query", () => {
    assert.equal(ELEVATE_SOCIAL_URLS.instagram.includes("igsh"), false)
    assert.equal(ELEVATE_SOCIAL_URLS.instagram.includes("?"), false)
  })

  test("no tracking Instagram URL remains in app source", () => {
    const trackingNeedle = ["igsh", "="].join("")
    const files = collectSourceFiles(path.join(root, "src")).filter(
      (file) => !file.endsWith(".test.ts")
    )
    for (const file of files) {
      const contents = readFileSync(file, "utf8")
      assert.equal(
        contents.includes(trackingNeedle),
        false,
        `unexpected Instagram tracking param in ${path.relative(root, file)}`
      )
      assert.equal(
        /instagram\.com\/[^?\s"']+\?igsh=/i.test(contents),
        false,
        `unexpected tracked Instagram URL in ${path.relative(root, file)}`
      )
    }
  })

  test("footer keeps profile icons in a row and Facebook community as text below", () => {
    const footer = readRepo("src/components/layout/footer.tsx")
    assert.match(footer, /PUBLIC_SOCIAL_PROFILE_LINKS/)
    assert.match(footer, /PUBLIC_FACEBOOK_GROUP_LINK/)
    assert.match(footer, /PUBLIC_FACEBOOK_GROUP_LINK_CLASSNAME/)
    assert.match(footer, /PUBLIC_FACEBOOK_GROUP_LINK\.label/)
    assert.match(footer, /PUBLIC_FACEBOOK_GROUP_LINK\.description/)
    assert.match(footer, /target=\{link\.target\}/)
    assert.match(footer, /rel=\{link\.rel\}/)
    assert.match(footer, /aria-label=\{link\.ariaLabel\}/)
    assert.match(footer, /aria-label=\{PUBLIC_FACEBOOK_GROUP_LINK\.ariaLabel\}/)
    assert.match(footer, /aria-label="Social media"/)
    assert.match(footer, /PUBLIC_SOCIAL_LINK_CLASSNAME/)
    assert.match(footer, /gap-3/)
    assert.match(footer, /mt-4/)
    assert.doesNotMatch(footer, /FacebookCommunityIcon/)
    assert.doesNotMatch(footer, /title=\{PUBLIC_FACEBOOK_GROUP_LINK\.description\}/)
    assert.doesNotMatch(footer, /instagram\.com\/[^"']+\?igsh=/)
    assert.doesNotMatch(footer, /https:\/\/instagram\.com"/)
    assert.doesNotMatch(footer, /https:\/\/facebook\.com"/)
    assert.doesNotMatch(footer, /https:\/\/linkedin\.com"/)

    // Community link is outside the social icon nav, not a fourth icon button.
    const socialNav = footer.slice(
      footer.indexOf('aria-label="Social media"'),
      footer.indexOf("</nav>", footer.indexOf('aria-label="Social media"'))
    )
    assert.match(socialNav, /PUBLIC_SOCIAL_PROFILE_LINKS/)
    assert.doesNotMatch(socialNav, /PUBLIC_FACEBOOK_GROUP_LINK/)

    const icons = readRepo("src/components/layout/social-icons.tsx")
    assert.doesNotMatch(icons, /FacebookCommunityIcon/)
    assert.match(icons, /function FacebookIcon/)
    assert.match(icons, /function InstagramIcon/)
    assert.match(icons, /function LinkedInIcon/)
    assert.match(icons, /size-\[21px\]/)
    assert.match(icons, /fill:\s*"currentColor"/)
  })

  test("about page links the same official destinations without navbar clutter", () => {
    const about = readRepo("src/app/(public)/about/page.tsx")
    assert.match(about, /PUBLIC_SOCIAL_PROFILE_LINKS/)
    assert.match(about, /PUBLIC_FACEBOOK_GROUP_LINK/)
    assert.match(about, /Connect with/)
    assert.match(about, /Facebook community/)
    assert.match(about, /title=\{PUBLIC_FACEBOOK_GROUP_LINK\.description\}/)
    assert.doesNotMatch(about, /PUBLIC_FACEBOOK_GROUP_LINK\.label/)
    assert.doesNotMatch(
      about,
      />\s*\{PUBLIC_FACEBOOK_GROUP_LINK\.description\}\s*</
    )

    const publicNavbar = readRepo("src/components/layout/navbar.tsx")
    assert.doesNotMatch(publicNavbar, /ELEVATE_SOCIAL_URLS/)
    assert.doesNotMatch(publicNavbar, /PUBLIC_SOCIAL_PROFILE_LINKS/)
  })

  test("social anchors remain keyboard accessible with visible focus and touch targets", () => {
    assert.match(PUBLIC_SOCIAL_LINK_CLASSNAME, /size-11/)
    assert.match(PUBLIC_SOCIAL_LINK_CLASSNAME, /rounded-full/)
    assert.match(PUBLIC_SOCIAL_LINK_CLASSNAME, /focus-visible:outline/)
    assert.match(PUBLIC_SOCIAL_LINK_CLASSNAME, /motion-reduce/)
    assert.match(PUBLIC_SOCIAL_LINK_CLASSNAME, /hover:-translate-y-px/)
    assert.match(PUBLIC_FACEBOOK_GROUP_LINK_CLASSNAME, /focus-visible:outline/)

    const footer = readRepo("src/components/layout/footer.tsx")
    assert.doesNotMatch(footer, /tabIndex=\{?-1\}?/)
    assert.match(footer, /PUBLIC_SOCIAL_LINK_CLASSNAME/)
    assert.match(footer, /PUBLIC_FACEBOOK_GROUP_LINK_CLASSNAME/)

    const about = readRepo("src/app/(public)/about/page.tsx")
    assert.doesNotMatch(about, /tabIndex=\{?-1\}?/)
    assert.match(about, /focus-visible:outline/)
    assert.match(about, /min-h-11/)
  })

  test("raw social URLs are not duplicated outside the canonical module", () => {
    let result = ""
    try {
      result = execFileSync(
        "rg",
        [
          "-n",
          "--glob",
          "!**/social-links.ts",
          "--glob",
          "!**/social-links.test.ts",
          "instagram\\.com/elevatewithdrdeepa|facebook\\.com/deepa\\.pattani|facebook\\.com/groups/preautoimmune|linkedin\\.com/in/dr-deepa-pattani",
          "src",
        ],
        { cwd: root, encoding: "utf8" }
      ).trim()
    } catch (error) {
      const err = error as { status?: number; stdout?: string }
      // ripgrep exits 1 when there are no matches — that is the desired outcome.
      if (err.status !== 1) {
        throw error
      }
      result = (err.stdout ?? "").trim()
    }
    assert.equal(result, "")
  })
})
