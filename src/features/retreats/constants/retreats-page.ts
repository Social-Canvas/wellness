/**
 * Approved copy for the public Retreats landing page.
 * Do not invent dates, venues, pricing, inclusions, or testimonials.
 */

export const RETREATS_PAGE = {
  metaTitle: "Retreats & Private Events",
  metaDescription:
    "Explore past Elevate retreats in Bali and Sedona and learn about the upcoming Rishikesh retreat planned for March to April 2027.",

  hero: {
    eyebrow: "Retreats & Private Events",
    heading: "Step away. Reconnect. Return renewed.",
    body: "Elevate retreats create space to slow down, reconnect with yourself, and experience restorative practices in intentional settings.",
    primaryCta: {
      label: "Explore upcoming retreat",
      href: "#rishikesh-2027",
    },
    secondaryCta: {
      label: "Ask for more information",
      href: "#ask-for-more-information",
    },
  },

  philosophy: {
    heading: "An intentional pause",
    body: "Each Elevate retreat is shaped around breathwork, reflection, and restorative practices in settings chosen for calm and connection. Details are shared as each experience is finalized.",
  },

  past: {
    heading: "Past Retreats",
    supporting: "A look back at previous Elevate retreat experiences.",
    placeholderDetail: "Highlights and retreat details coming soon.",
    items: [
      {
        id: "bali",
        title: "Bali",
        label: "Past Retreat",
        /** Confidently Bali-associated brand image (Balinese temple meditation). */
        imageKey: "founderTempleMeditation" as const,
      },
      {
        id: "sedona",
        title: "Sedona",
        label: "Past Retreat",
        /** No Sedona-specific asset yet; use neutral branded treatment. */
        imageKey: null,
      },
    ],
  },

  upcoming: {
    id: "rishikesh-2027",
    eyebrow: "Upcoming",
    heading: "Rishikesh 2027",
    timing: "March to April 2027",
    intro:
      "Elevate is preparing an upcoming retreat experience in Rishikesh for March to April 2027. Additional details, dates, and registration information will be shared as plans are finalized.",
    ctaLabel: "Ask for more information",
    ctaHref: "#ask-for-more-information",
  },

  enquiry: {
    id: "ask-for-more-information",
    heading: "Interested in Rishikesh?",
    supporting:
      "Share your details and we will keep you informed as retreat dates and registration information become available.",
  },

  finalCta: {
    heading: "Private events",
    body: "Looking for a private group experience? Share your interest and the Elevate team will follow up with suitable options.",
    ctaLabel: "Ask for more information",
    ctaHref: "#ask-for-more-information",
  },
} as const
