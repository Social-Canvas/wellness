/**
 * Approved copy for the public Retreats landing page.
 * Timeless editorial storytelling. Do not invent dates, venues, pricing,
 * itineraries, or inclusions. Do not surface historical booking details.
 */

export const RETREATS_PAGE = {
  metaTitle: "Retreats",
  metaDescription:
    "Explore Elevate retreat experiences and the upcoming Rishikesh retreat planned for March to April 2027.",

  hero: {
    eyebrow: "ELEVATE RETREATS",
    heading: "Step away. Reconnect. Return renewed.",
    body: "Elevate retreats create intentional space to slow down, reconnect with yourself, and experience restorative practices in meaningful settings.",
    primaryCta: {
      label: "Explore retreats",
      href: "#rishikesh-2027",
    },
    secondaryCta: {
      label: "Ask for more information",
      href: "#ask-for-more-information",
    },
  },

  past: {
    id: "past-retreats",
    heading: "Past Retreats",
    supporting:
      "Previous Elevate experiences have brought together restorative practices, reflection, nature, and meaningful connection.",
    items: [
      {
        id: "sedona",
        title: "Sedona",
        label: "Past Retreat",
        description:
          "A restorative retreat experience surrounded by Sedona's remarkable landscape, with space for breathwork, meditation, reflection, nature, and connection.",
        imageKey: "sedonaRetreatLandscape" as const,
      },
      {
        id: "bali",
        title: "Bali",
        label: "Past Retreat",
        description:
          "An immersive retreat experience centered on stepping away from daily demands, creating space for reflection, connection, and renewal.",
        /** Same asset as the homepage hero banner. */
        imageKey: "founderTempleMeditation" as const,
      },
    ],
  },

  expect: {
    id: "what-to-expect",
    heading: "What to expect from an Elevate retreat",
    intro:
      "Each retreat is thoughtfully shaped around its setting and community, while creating space for restorative practices and meaningful connection.",
    items: [
      {
        title: "Guided breathwork and meditation",
        description: "Practices that help you slow down and return to presence.",
      },
      {
        title: "Time for reflection and reconnection",
        description: "Space to step away from noise and listen inward.",
      },
      {
        title: "Restorative experiences",
        description: "Gentle rhythm designed for recovery and renewal.",
      },
      {
        title: "Connection with nature",
        description: "Settings chosen for calm, beauty, and grounded presence.",
      },
      {
        title: "Nourishing moments and intentional rest",
        description: "Room to restore through simple, supportive care.",
      },
      {
        title: "Community and shared experience",
        description: "Meaningful connection with others on a similar path.",
      },
    ],
  },

  upcoming: {
    id: "rishikesh-2027",
    eyebrow: "UPCOMING",
    heading: "Rishikesh 2027",
    timing: "March to April 2027",
    intro:
      "A new Elevate retreat experience is being planned for Rishikesh in 2027. Additional details, dates, and registration information will be shared as plans are finalized.",
    ctaLabel: "Ask for more information",
    ctaHref: "#ask-for-more-information",
  },

  enquiry: {
    id: "ask-for-more-information",
    heading: "Interested in an upcoming retreat?",
    supporting:
      "Share your details and we'll keep you informed as upcoming retreat plans and registration information become available.",
  },
} as const
