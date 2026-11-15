import { BRAND_IMAGES } from "@/lib/brand/images"
import {
  HOMEPAGE_NONPROFIT_SECTION,
  NONPROFIT_EXPLORE_CTA,
  NONPROFIT_INQUIRY_CTA,
  NONPROFIT_MISSION_BODY,
  NONPROFIT_MISSION_HEADING,
  NONPROFIT_SEE_WHATS_INCLUDED_CTA,
} from "@/features/checkout/utils/membership-audience"
import { RETREATS_PAGE } from "@/features/retreats/constants/retreats-page"
import { ELEVATE_MEMBERSHIPS } from "@/lib/constants/elevate-brand"
import { PUBLIC_FOOTER_DESCRIPTION } from "@/lib/constants/public-site"
import { ELEVATE_SOCIAL_URLS } from "@/lib/constants/social-links"
import { SITE_SEO } from "@/lib/seo/site-seo"
import { VIDEO_TESTIMONIALS_SECTION } from "@/features/marketing-testimonials/data/testimonials"

export type SiteFieldType = "text" | "textarea" | "lines" | "url" | "image"

export type SiteField = {
  key: string
  group: string
  label: string
  help?: string
  type: SiteFieldType
  defaultValue: string
  defaultAlt?: string
  required?: boolean
  sort: number
}

export const SITE_CONTENT_GROUPS = [
  { key: "homepage", label: "Homepage" },
  { key: "about", label: "About" },
  { key: "membership", label: "Membership copy" },
  { key: "retreats", label: "Retreats" },
  { key: "nonprofit", label: "Nonprofit" },
  { key: "testimonials", label: "Testimonials" },
  { key: "global", label: "Footer, social, and SEO" },
] as const

const MEMBERSHIP_HELP =
  "Marketing text only. This does not change the price or what the membership unlocks."

function membership(slug: "plan-1" | "plan-2" | "plan-3") {
  const tier = ELEVATE_MEMBERSHIPS.find((item) => item.slug === slug)
  if (!tier) {
    throw new Error(`Missing membership tier ${slug}`)
  }
  return tier
}

const core = membership("plan-1")
const gold = membership("plan-2")
const platinum = membership("plan-3")

function field(
  input: Omit<SiteField, "sort"> & { sort: number }
): SiteField {
  return input
}

const HOME_FAQ = [
  [
    "Is this medical care?",
    "Elevate provides educational functional medicine and breathwork content. It is not a substitute for medical diagnosis or treatment. Always consult your physician.",
  ],
  [
    "How is this different from conventional medicine?",
    "Conventional care often manages symptoms. Dr. Pattani's approach identifies root causes (nervous system dysregulation, inflammation, hormones, and lifestyle) using science + soul.",
  ],
  [
    "Where do I start?",
    "Most people begin with the Reset Plan, then choose Elevate Core, Gold, or Platinum depending on the level of support and live access they want.",
  ],
  [
    "Are sessions virtual?",
    "Yes. Core content and many sessions are delivered virtually. Elevate Platinum includes the full live Elevate experience; retreats are offered separately.",
  ],
  [
    "Is this safe alongside my medications?",
    "Dr. Pattani is a Doctor of Pharmacy with deep pharmacology expertise. Always keep your prescribing physician informed about any program you join.",
  ],
] as const

const JOURNEY = [
  [
    "Ground",
    "Nervous system safety first: release survival mode, reduce burnout, and teach the body it is safe to rest.",
  ],
  [
    "Release",
    "Move stored stress and emotional patterns through guided breathwork, gut support, and hormonal balance.",
  ],
  [
    "Align & expand",
    "Embody sustainable transformation: clarity, resilience, purpose, and leadership from a regulated nervous system.",
  ],
] as const

function faqFields(): SiteField[] {
  const fields: SiteField[] = []
  for (let index = 0; index < 8; index += 1) {
    const pair = HOME_FAQ[index]
    const number = index + 1
    fields.push(
      field({
        key: `homepage.faq.${number}.question`,
        group: "homepage",
        label: `FAQ ${number} question`,
        help: pair ? undefined : "Leave blank to hide this extra question.",
        type: "text",
        defaultValue: pair?.[0] ?? "",
        required: Boolean(pair),
        sort: 200 + index * 2,
      }),
      field({
        key: `homepage.faq.${number}.answer`,
        group: "homepage",
        label: `FAQ ${number} answer`,
        type: "textarea",
        defaultValue: pair?.[1] ?? "",
        required: Boolean(pair),
        sort: 201 + index * 2,
      })
    )
  }
  return fields
}

function journeyFields(): SiteField[] {
  return JOURNEY.flatMap((step, index) => {
    const number = index + 1
    return [
      field({
        key: `homepage.journey.${number}.title`,
        group: "homepage",
        label: `Journey step ${number} title`,
        type: "text",
        defaultValue: step[0],
        required: true,
        sort: 80 + index * 2,
      }),
      field({
        key: `homepage.journey.${number}.body`,
        group: "homepage",
        label: `Journey step ${number} text`,
        type: "textarea",
        defaultValue: step[1],
        required: true,
        sort: 81 + index * 2,
      }),
    ]
  })
}

function testimonialFields(): SiteField[] {
  const fields: SiteField[] = []
  for (let number = 1; number <= 6; number += 1) {
    const sort = number * 10
    fields.push(
      field({
        key: `testimonial.${number}.name`,
        group: "testimonials",
        label: `Video ${number} name`,
        help: "Leave blank until a real name is supplied. Do not invent one.",
        type: "text",
        defaultValue: "",
        sort,
      }),
      field({
        key: `testimonial.${number}.role`,
        group: "testimonials",
        label: `Video ${number} attribution`,
        type: "text",
        defaultValue: "",
        sort: sort + 1,
      }),
      field({
        key: `testimonial.${number}.quote`,
        group: "testimonials",
        label: `Video ${number} quote`,
        help: "Short quote only. Do not add health claims that were not supplied.",
        type: "textarea",
        defaultValue: "",
        sort: sort + 2,
      })
    )
  }
  return fields
}

export const SITE_CONTENT_FIELDS: readonly SiteField[] = [
  field({
    key: "homepage.hero.eyebrow",
    group: "homepage",
    label: "Hero eyebrow",
    type: "text",
    defaultValue: "Science + soul",
    required: true,
    sort: 10,
  }),
  field({
    key: "homepage.hero.title",
    group: "homepage",
    label: "Hero heading",
    type: "text",
    defaultValue: "Regulate your nervous system.",
    required: true,
    sort: 11,
  }),
  field({
    key: "homepage.hero.highlighted",
    group: "homepage",
    label: "Hero second line",
    type: "text",
    defaultValue: "Heal at the root.",
    required: true,
    sort: 12,
  }),
  field({
    key: "homepage.hero.description",
    group: "homepage",
    label: "Hero subheading",
    type: "textarea",
    defaultValue:
      "Elevate Health Solutions blends functional medicine, breathwork, and evidence-informed healing to help high-performing professionals move beyond burnout, anxiety, and depletion into clarity, resilience, and vibrant health.",
    required: true,
    sort: 13,
  }),
  field({
    key: "homepage.hero.primary_cta",
    group: "homepage",
    label: "Primary button text",
    type: "text",
    defaultValue: "Start Reset Plan",
    required: true,
    sort: 14,
  }),
  field({
    key: "homepage.hero.primary_href",
    group: "homepage",
    label: "Primary button link",
    help: "Internal path only, such as /programs#reset-plan.",
    type: "url",
    defaultValue: "/programs#reset-plan",
    required: true,
    sort: 15,
  }),
  field({
    key: "homepage.hero.secondary_cta",
    group: "homepage",
    label: "Secondary button text",
    type: "text",
    defaultValue: "Explore memberships",
    required: true,
    sort: 16,
  }),
  field({
    key: "homepage.hero.secondary_href",
    group: "homepage",
    label: "Secondary button link",
    type: "url",
    defaultValue: "#memberships",
    required: true,
    sort: 17,
  }),
  field({
    key: "homepage.hero.trust",
    group: "homepage",
    label: "Trust line",
    help: "One item per line.",
    type: "lines",
    defaultValue: [
      "Featured in Forbes",
      "Authority Magazine",
      "Best-selling author",
      "Functional medicine & breathwork",
    ].join("\n"),
    required: true,
    sort: 18,
  }),
  field({
    key: "homepage.hero.image",
    group: "homepage",
    label: "Hero image",
    type: "image",
    defaultValue: BRAND_IMAGES.founderTempleMeditation.src,
    defaultAlt: BRAND_IMAGES.founderTempleMeditation.alt,
    required: true,
    sort: 19,
  }),
  field({
    key: "homepage.announcement",
    group: "homepage",
    label: "Announcement",
    help: "Optional bar above the public pages. Leave blank to keep it hidden.",
    type: "text",
    defaultValue: "",
    sort: 20,
  }),
  field({
    key: "homepage.journey.eyebrow",
    group: "homepage",
    label: "Journey eyebrow",
    type: "text",
    defaultValue: "The Elevate journey",
    required: true,
    sort: 70,
  }),
  field({
    key: "homepage.journey.title",
    group: "homepage",
    label: "Journey heading",
    type: "text",
    defaultValue: "A structured path to nervous system transformation",
    required: true,
    sort: 71,
  }),
  ...journeyFields(),
  field({
    key: "homepage.faq.eyebrow",
    group: "homepage",
    label: "FAQ eyebrow",
    type: "text",
    defaultValue: "Questions, answered",
    required: true,
    sort: 180,
  }),
  field({
    key: "homepage.faq.title",
    group: "homepage",
    label: "FAQ heading",
    type: "text",
    defaultValue: "Before you begin",
    required: true,
    sort: 181,
  }),
  ...faqFields(),
  field({
    key: "homepage.nonprofit.eyebrow",
    group: "homepage",
    label: "Nonprofit eyebrow",
    type: "text",
    defaultValue: HOMEPAGE_NONPROFIT_SECTION.eyebrow,
    required: true,
    sort: 300,
  }),
  field({
    key: "homepage.nonprofit.heading",
    group: "homepage",
    label: "Nonprofit heading",
    type: "text",
    defaultValue: HOMEPAGE_NONPROFIT_SECTION.heading,
    required: true,
    sort: 301,
  }),
  field({
    key: "homepage.nonprofit.body",
    group: "homepage",
    label: "Nonprofit text",
    type: "textarea",
    defaultValue: HOMEPAGE_NONPROFIT_SECTION.body,
    required: true,
    sort: 302,
  }),
  field({
    key: "homepage.nonprofit.cta",
    group: "homepage",
    label: "Nonprofit button text",
    help: "The link stays /nonprofits.",
    type: "text",
    defaultValue: NONPROFIT_EXPLORE_CTA,
    required: true,
    sort: 303,
  }),
  field({
    key: "homepage.seo.title",
    group: "homepage",
    label: "SEO title",
    type: "text",
    defaultValue: SITE_SEO.homeTitle,
    required: true,
    sort: 400,
  }),
  field({
    key: "homepage.seo.description",
    group: "homepage",
    label: "SEO description",
    type: "textarea",
    defaultValue: SITE_SEO.homeDescription,
    required: true,
    sort: 401,
  }),
  field({
    key: "about.intro",
    group: "about",
    label: "Intro",
    help: "Separate paragraphs with a blank line.",
    type: "textarea",
    defaultValue: [
      "Doctor of Pharmacy · Functional Medicine · Breathwork & Sound Healing. Founder of Elevate Health Solutions and creator of the science + soul approach to nervous system regulation and functional healing.",
      "For over two decades, Dr. Pattani has helped exhausted, overwhelmed professionals break free from fatigue, anxiety, and hopelessness, and step into energy, control, and vibrant health through the signature 7-Step PATTANI Protocol.",
    ].join("\n\n"),
    required: true,
    sort: 10,
  }),
  field({
    key: "about.healer",
    group: "about",
    label: "Healer story",
    help: "Separate paragraphs with a blank line.",
    type: "textarea",
    defaultValue: [
      "Healing runs in her blood. A personal transformation in Bali, where traditional practices met modern medical science, confirmed what years of clinical work had shown: sustainable healing requires both evidence and embodiment.",
      "After losing 40 pounds without pharmaceuticals using the same holistic tools she now teaches, Dr. Pattani committed fully to functional medicine, finding and fixing root causes rather than managing symptoms on the surface.",
    ].join("\n\n"),
    required: true,
    sort: 11,
  }),
  field({
    key: "about.credentials",
    group: "about",
    label: "Credentials",
    help: "One credential per line.",
    type: "lines",
    defaultValue: [
      "Doctor of Pharmacy",
      "Certified Functional Medicine Specialist",
      "Board-Certified Breathwork Practitioner",
      "Reiki & Sound Healing Facilitator",
      "LDN Compounder",
      "CBD Specialist",
    ].join("\n"),
    required: true,
    sort: 12,
  }),
  field({
    key: "about.press",
    group: "about",
    label: "Publications",
    help: "One per line. Optional link after a vertical bar: Forbes|https://example.com",
    type: "lines",
    defaultValue: ["Forbes", "Authority Magazine", "Dallas Voyage Magazine"].join("\n"),
    required: true,
    sort: 13,
  }),
  field({
    key: "about.books",
    group: "about",
    label: "Books",
    type: "textarea",
    defaultValue:
      "Best-selling author of Unleashing the Storrie Within and contributing author to the Amazon bestseller Creating a Functional Medicine Revolution. She is currently writing The Earth is My Body, the first in a series on human healing and the natural world.",
    required: true,
    sort: 14,
  }),
  field({
    key: "about.quote",
    group: "about",
    label: "Quote",
    type: "textarea",
    defaultValue:
      "Healing is not something we force. It is something we allow when we return to ourselves.",
    required: true,
    sort: 15,
  }),
  field({
    key: "about.portrait",
    group: "about",
    label: "Portrait",
    type: "image",
    defaultValue: BRAND_IMAGES.founderPortrait.src,
    defaultAlt: BRAND_IMAGES.founderPortrait.alt,
    required: true,
    sort: 16,
  }),
  field({
    key: "about.seo.description",
    group: "about",
    label: "SEO description",
    type: "textarea",
    defaultValue:
      "Meet Dr. Deepa Pattani, Doctor of Pharmacy, functional medicine specialist, and founder of Elevate Health Solutions.",
    required: true,
    sort: 40,
  }),
  field({
    key: "membership.core.who",
    group: "membership",
    label: "Core description",
    help: MEMBERSHIP_HELP,
    type: "textarea",
    defaultValue: core.whoItIsFor,
    required: true,
    sort: 10,
  }),
  field({
    key: "membership.core.features",
    group: "membership",
    label: "Core benefits",
    help: `${MEMBERSHIP_HELP} One benefit per line.`,
    type: "lines",
    defaultValue: core.features.join("\n"),
    required: true,
    sort: 11,
  }),
  field({
    key: "membership.gold.who",
    group: "membership",
    label: "Gold description",
    help: MEMBERSHIP_HELP,
    type: "textarea",
    defaultValue: gold.whoItIsFor,
    required: true,
    sort: 20,
  }),
  field({
    key: "membership.gold.features",
    group: "membership",
    label: "Gold benefits",
    help: `${MEMBERSHIP_HELP} One benefit per line.`,
    type: "lines",
    defaultValue: gold.features.join("\n"),
    required: true,
    sort: 21,
  }),
  field({
    key: "membership.platinum.who",
    group: "membership",
    label: "Platinum description",
    help: MEMBERSHIP_HELP,
    type: "textarea",
    defaultValue: platinum.whoItIsFor,
    required: true,
    sort: 30,
  }),
  field({
    key: "membership.platinum.features",
    group: "membership",
    label: "Platinum benefits",
    help: `${MEMBERSHIP_HELP} One benefit per line. Do not invent a visit frequency.`,
    type: "lines",
    defaultValue: platinum.features.join("\n"),
    required: true,
    sort: 31,
  }),
  field({
    key: "retreats.hero.heading",
    group: "retreats",
    label: "Hero heading",
    type: "text",
    defaultValue: RETREATS_PAGE.hero.heading,
    required: true,
    sort: 10,
  }),
  field({
    key: "retreats.hero.body",
    group: "retreats",
    label: "Hero text",
    type: "textarea",
    defaultValue: RETREATS_PAGE.hero.body,
    required: true,
    sort: 11,
  }),
  field({
    key: "retreats.hero.primary_cta",
    group: "retreats",
    label: "Primary button text",
    help: "The link stays on this page.",
    type: "text",
    defaultValue: RETREATS_PAGE.hero.primaryCta.label,
    required: true,
    sort: 12,
  }),
  field({
    key: "retreats.hero.secondary_cta",
    group: "retreats",
    label: "Secondary button text",
    type: "text",
    defaultValue: RETREATS_PAGE.hero.secondaryCta.label,
    required: true,
    sort: 13,
  }),
  field({
    key: "retreats.seo.description",
    group: "retreats",
    label: "SEO description",
    type: "textarea",
    defaultValue: RETREATS_PAGE.metaDescription,
    required: true,
    sort: 20,
  }),
  field({
    key: "nonprofit.mission.heading",
    group: "nonprofit",
    label: "Mission heading",
    type: "text",
    defaultValue: NONPROFIT_MISSION_HEADING,
    required: true,
    sort: 10,
  }),
  field({
    key: "nonprofit.mission.body",
    group: "nonprofit",
    label: "Mission text",
    type: "textarea",
    defaultValue: NONPROFIT_MISSION_BODY,
    required: true,
    sort: 11,
  }),
  field({
    key: "nonprofit.inquiry_cta",
    group: "nonprofit",
    label: "Enquiry button text",
    help: "The link stays the nonprofit enquiry form.",
    type: "text",
    defaultValue: NONPROFIT_INQUIRY_CTA,
    required: true,
    sort: 12,
  }),
  field({
    key: "nonprofit.included_cta",
    group: "nonprofit",
    label: "Included button text",
    type: "text",
    defaultValue: NONPROFIT_SEE_WHATS_INCLUDED_CTA,
    required: true,
    sort: 13,
  }),
  field({
    key: "testimonials.eyebrow",
    group: "testimonials",
    label: "Section eyebrow",
    type: "text",
    defaultValue: VIDEO_TESTIMONIALS_SECTION.eyebrow,
    required: true,
    sort: 1,
  }),
  field({
    key: "testimonials.title",
    group: "testimonials",
    label: "Section heading",
    type: "text",
    defaultValue: VIDEO_TESTIMONIALS_SECTION.title,
    required: true,
    sort: 2,
  }),
  field({
    key: "testimonials.subtitle",
    group: "testimonials",
    label: "Section text",
    type: "textarea",
    defaultValue: VIDEO_TESTIMONIALS_SECTION.subtitle,
    required: true,
    sort: 3,
  }),
  ...testimonialFields(),
  field({
    key: "global.footer.description",
    group: "global",
    label: "Footer description",
    type: "textarea",
    defaultValue: PUBLIC_FOOTER_DESCRIPTION,
    required: true,
    sort: 10,
  }),
  field({
    key: "global.nav.cta_label",
    group: "global",
    label: "Header button text",
    type: "text",
    defaultValue: "Start Reset Plan",
    required: true,
    sort: 20,
  }),
  field({
    key: "global.nav.cta_href",
    group: "global",
    label: "Header button link",
    type: "url",
    defaultValue: "/programs#reset-plan",
    required: true,
    sort: 21,
  }),
  field({
    key: "global.social.instagram",
    group: "global",
    label: "Instagram URL",
    type: "url",
    defaultValue: ELEVATE_SOCIAL_URLS.instagram,
    required: true,
    sort: 30,
  }),
  field({
    key: "global.social.facebook",
    group: "global",
    label: "Facebook URL",
    type: "url",
    defaultValue: ELEVATE_SOCIAL_URLS.facebook,
    required: true,
    sort: 31,
  }),
  field({
    key: "global.social.linkedin",
    group: "global",
    label: "LinkedIn URL",
    type: "url",
    defaultValue: ELEVATE_SOCIAL_URLS.linkedin,
    required: true,
    sort: 32,
  }),
  field({
    key: "global.social.facebook_group",
    group: "global",
    label: "Facebook community URL",
    type: "url",
    defaultValue: ELEVATE_SOCIAL_URLS.facebookGroup,
    required: true,
    sort: 33,
  }),
  field({
    key: "global.social.facebook_group_label",
    group: "global",
    label: "Facebook community label",
    type: "text",
    defaultValue: "Join our Facebook community",
    required: true,
    sort: 34,
  }),
  field({
    key: "global.seo.og_image",
    group: "global",
    label: "Social share image",
    type: "image",
    defaultValue: SITE_SEO.ogImage.path,
    defaultAlt: SITE_SEO.ogImage.alt,
    required: true,
    sort: 40,
  }),
] as const

const FIELD_BY_KEY = new Map(SITE_CONTENT_FIELDS.map((item) => [item.key, item]))

export function getSiteField(key: string): SiteField | undefined {
  return FIELD_BY_KEY.get(key)
}

export function siteDefault(key: string): string {
  return FIELD_BY_KEY.get(key)?.defaultValue ?? ""
}
