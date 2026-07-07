export type SampleBlogArticle = {
  slug: string
  category: string
  title: string
  excerpt: string
  readTime: string
  author: string
  content: Array<
    | { type: "paragraph"; text: string }
    | { type: "heading"; text: string }
    | { type: "cta"; title: string; description: string; href: string; label: string }
  >
}

export const SAMPLE_BLOG_ARTICLES: SampleBlogArticle[] = [
  {
    slug: "fatigue",
    category: "Energy",
    title: "5 root causes of fatigue most doctors miss",
    excerpt:
      'If you are tired no matter how much you sleep, the answer is rarely "rest more." Here is what to look at instead.',
    readTime: "7 min read",
    author: "Wellness Studio team",
    content: [
      {
        type: "paragraph",
        text: "If you are tired no matter how much you sleep, the answer is rarely rest more. Here is what to look at instead. In holistic wellness, we do not start with the symptom — we start with the question: why is this happening at all? That single shift changes everything about how you heal.",
      },
      { type: "heading", text: "It starts deeper than you think" },
      {
        type: "paragraph",
        text: "Most conventional visits name a symptom and match it to a prescription. For slow, draining issues — fatigue, brain fog, anxious nights — that often misses the upstream cause entirely.",
      },
      {
        type: "paragraph",
        text: "The body is a connected system. Your gut talks to your hormones, your hormones talk to your nervous system, and that shapes how you sleep, eat, and feel. Strain one link and the effects ripple outward in ways that look unrelated.",
      },
      { type: "heading", text: "What to look at instead" },
      {
        type: "paragraph",
        text: "Start with the foundations: blood sugar, gut health, sleep, and your stress response. Small, consistent shifts here tend to outperform any single supplement.",
      },
      { type: "heading", text: "Where to begin" },
      {
        type: "paragraph",
        text: "Pick one foundation and give it two gentle weeks. Notice what shifts, then build from there — ideally with guidance so you are not guessing alone.",
      },
      {
        type: "cta",
        title: "Ready to go deeper?",
        description: "Explore the programs built around exactly these foundations.",
        href: "/programs",
        label: "Browse programs",
      },
    ],
  },
  {
    slug: "gutmind",
    category: "Gut Health",
    title: "How your gut quietly controls your hormones",
    excerpt:
      "The gut and your hormones are in constant conversation. When it breaks down, everything feels off.",
    readTime: "6 min read",
    author: "Wellness Studio team",
    content: [
      {
        type: "paragraph",
        text: "The gut and your hormones are in constant conversation. When that communication breaks down, energy, mood, sleep, and cycles can all feel unpredictable at once.",
      },
      { type: "heading", text: "Why the gut matters so much" },
      {
        type: "paragraph",
        text: "Your microbiome helps regulate inflammation, nutrient absorption, and the signals your body uses to manage stress. Ignore gut health and hormone support often stays patchy.",
      },
      { type: "heading", text: "Practical first steps" },
      {
        type: "paragraph",
        text: "Begin with consistent meal timing, enough fiber, and a stress buffer before meals. These basics create the conditions your hormones need to stabilize.",
      },
      {
        type: "cta",
        title: "Want guided support?",
        description: "Membership includes weekly content on gut, hormones, and nervous system care.",
        href: "/programs",
        label: "View membership plans",
      },
    ],
  },
  {
    slug: "cortisol",
    category: "Stress",
    title: "Cortisol is not the enemy, but yours might be stuck",
    excerpt:
      "Chronic stress reshapes your whole day. Learn to read the signs and reset your stress response.",
    readTime: "8 min read",
    author: "Wellness Studio team",
    content: [
      {
        type: "paragraph",
        text: "Cortisol is not the enemy — it helps you wake up, focus, and respond to real challenges. The problem is when your stress response stays switched on long after the moment has passed.",
      },
      { type: "heading", text: "Signs your stress response is stuck" },
      {
        type: "paragraph",
        text: "Wired-but-tired evenings, difficulty falling asleep, afternoon crashes, and feeling on edge without a clear reason are common clues that your nervous system needs a reset.",
      },
      { type: "heading", text: "How to begin unwinding" },
      {
        type: "paragraph",
        text: "Short breathwork, morning light, and predictable sleep anchors are simple tools that compound. The goal is not to eliminate stress — it is to recover from it faster.",
      },
      {
        type: "cta",
        title: "Try a free taster",
        description: "Sample a guided session before you choose a membership or program.",
        href: "/free-taster",
        label: "Get the free taster",
      },
    ],
  },
]

export function getSampleBlogArticle(slug: string): SampleBlogArticle | undefined {
  return SAMPLE_BLOG_ARTICLES.find((article) => article.slug === slug)
}
