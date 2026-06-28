# Design System

Extracted from `docs/reference/Sample_Platform_Demo.html` — the canonical visual reference for the Online Yoga Membership Platform.

**Brand placeholder in demo:** "Wellness Studio" — replace with client branding in implementation.

**Purpose:** Guide Tailwind theme configuration and React component extraction. All values below map directly to CSS in the HTML template.

---

## 1. Design Principles

| Principle | Expression |
|-----------|------------|
| Calm & holistic | Soft cream backgrounds, muted greens and blues, generous whitespace |
| Trust & clarity | Clear hierarchy, readable body copy, prominent CTAs |
| Membership-first | Pricing tiers, progress tracking, and dashboard patterns are first-class |
| Educational tone | Disclaimers, consent checkboxes, "educational not medical advice" messaging |
| Rounded & approachable | Pill buttons, 14–20px card radii, no sharp corners |

---

## 2. Color Palette

### 2.1 CSS Custom Properties (source of truth)

| Token | Hex | Role |
|-------|-----|------|
| `--cream` | `#F6FAF9` | Page background |
| `--cream2` | `#EDF4EF` | Alternate section background |
| `--white` | `#FFFFFF` | Cards, inputs, modals |
| `--blue` | `#2F7E96` | Primary brand, CTAs, links, accents |
| `--blue-deep` | `#235F73` | Primary hover, capture CTA text |
| `--blue-soft` | `#E7F2F2` | Highlight sections, summary boxes |
| `--green` | `#5E8E74` | Success, completion, play-button accents |
| `--green-deep` | `#4A7560` | Ticker, band backgrounds, category badges |
| `--green-soft` | `#EDF4EE` | Soft badges, saved-card bg, credential pills |
| `--ink` | `#1F3A43` | Primary text, dark bands, footer |
| `--ink-soft` | `#5A7077` | Secondary/muted text |
| `--line` | `#DCE8E6` | Borders, dividers |

### 2.2 Derived / Contextual Colors

| Usage | Value | Where |
|-------|-------|-------|
| Body text (article) | `#3A4F54` | Long-form prose |
| Footer text | `#C2D2D0` | Footer links |
| Footer muted | `#8FA3A1` | Copyright line |
| Footer accent | `#9FD0C9` | Logo highlight, band labels |
| Band body text | `#CDD9D7` | Dark band paragraphs |
| Capture subtitle | `#E2F0EF` | Blue capture section |
| Overlay scrim | `rgba(31,58,67,.55)` | Modal backdrop |
| Header glass | `rgba(246,250,249,.96)` | Sticky nav background |
| Category pill bg | `rgba(255,255,255,.85)` | On image thumbnails |
| Play button shadow | `rgba(47,126,150,.35)` | Large video play button |
| Footer border | `rgba(255,255,255,.12)` | Footer divider |

### 2.3 Gradients

```css
/* Image/video placeholders, card thumbs */
background: linear-gradient(135deg, var(--blue-soft), var(--green-soft));
```

### 2.4 Suggested Tailwind Mapping

```js
// tailwind.config — extend theme.colors
colors: {
  cream: { DEFAULT: '#F6FAF9', 2: '#EDF4EF' },
  brand: {
    blue: { DEFAULT: '#2F7E96', deep: '#235F73', soft: '#E7F2F2' },
    green: { DEFAULT: '#5E8E74', deep: '#4A7560', soft: '#EDF4EE' },
  },
  ink: { DEFAULT: '#1F3A43', soft: '#5A7077', muted: '#3A4F54' },
  line: '#DCE8E6',
}
```

---

## 3. Typography

### 3.1 Font Families

| Role | Stack | Tailwind class |
|------|-------|----------------|
| Display (headings) | `'Gilroy', 'Poppins', sans-serif` | `font-display` |
| Body | `'Simplicita', 'Mulish', -apple-system, sans-serif` | `font-body` |

**Google Fonts loaded in template:** Poppins (400, 500, 600, 700), Mulish (400, 500, 600, 700).

Gilroy and Simplicita are referenced as preferred brand fonts but fall back to Poppins/Mulish. Use Poppins + Mulish in implementation unless client provides licensed fonts.

### 3.2 Base Text

| Property | Value |
|----------|-------|
| Body size | `16px` |
| Body line-height | `1.65` |
| Body color | `var(--ink)` |
| Font smoothing | `antialiased` |

### 3.3 Heading Defaults

All `h1–h4`:
- `font-family: var(--display)`
- `font-weight: 500`
- `letter-spacing: -0.01em`
- `line-height: 1.18`

### 3.4 Type Scale

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| Hero H1 | `clamp(32px, 4.4vw, 52px)` | 500 | Italic `em` in brand blue |
| Section heading `.sh` | `clamp(25px, 3.3vw, 36px)` | 500 | Centered sections |
| Dashboard H2 | `28px` | 500 | `.dhead h2` |
| Tier H3 | `24px` | 500 | Pricing cards |
| Step H3 | `19px` | 500 | How-it-works |
| Card H4 | `15–18px` | 500 | Product/course cards |
| Course detail H1 | `34px` | 500 | Course page |
| Player H1 | `30px` | 500 | Video player page |
| Article H1 | `clamp(28px, 4vw, 40px)` | 500 | Blog article |
| Article H2 | `24px` | 500 | In-article subheads |
| Auth H3 | `23px` | 500 | Login card |
| Modal H3 | `22px` | 500 | Overlays |
| Certificate H2 | `30px` | 500 | Certificate page |
| Certificate name | `26px` | 500 display, blue | `.cert .nm` |
| Lead paragraph | `18px` | 400 | `.hero .lead` |
| Section subtitle `.ss` | inherit | 400, ink-soft | max-width 580px |
| Article body | `17px` | 400, line-height 1.75 | `.article p` |
| Body small | `14–15px` | 400–600 | Cards, forms, meta |
| Eyebrow | `12px` | 700, uppercase | letter-spacing 0.18em, blue |
| Label `.fl` | `13px` | 600, ink-soft | Form labels |
| Ticker | `13px` | 400 | Top announcement bar |
| Price (display) | `18–30px` | 600 display | Tier/product pricing |
| Price small | `12–14px` | 400 body, ink-soft | `/mo`, `one time` |

### 3.5 Eyebrow Pattern

Used above section headings throughout:

```
font-weight: 700
font-size: 12px
letter-spacing: 0.18em
text-transform: uppercase
color: var(--blue)
```

### 3.6 Level / Category Labels

Uppercase small caps for plan levels and card categories:

```
font-weight: 700
font-size: 11–11.5px
letter-spacing: 0.06–0.12em
text-transform: uppercase
color: var(--green-deep) or var(--blue)
```

---

## 4. Spacing & Layout

### 4.1 Container

| Token | Value | Class equivalent |
|-------|-------|------------------|
| Max width | `1120px` | `max-w-[1120px]` |
| Horizontal padding | `26px` | `px-[26px]` |
| Class name in HTML | `.wrap` | Centered container |

### 4.2 Section Spacing

| Context | Padding / margin |
|---------|------------------|
| Default section | `54px 0` (`.section`) |
| Hero | `58px 0 46px` |
| Dashboard | `38px 0 70px` |
| Auth page | `50px 26px`, min-height `72vh` |
| Section heading top margin | `12px` below eyebrow |
| Section subtitle margin | `14px auto 0` |
| Grid top margin (content) | `36–42px` below heading |

### 4.3 Grid Gaps

| Grid | Columns | Gap |
|------|---------|-----|
| Hero `.hgrid` | `1.05fr 0.95fr` | `48px` |
| 3-column `.g3` | `repeat(3, 1fr)` | `20px` |
| 2-column `.g2` | `1fr 1fr` | `20px` |
| 4-column `.tgrid` | `repeat(4, 1fr)` | `16px` |
| Steps | `repeat(3, 1fr)` | `22px` |
| Tiers | `repeat(3, 1fr)` | `20px` |
| Testimonials | `repeat(3, 1fr)` | `18px` |
| Course detail `.cd-grid` | `1.4fr 0.8fr` | `36px` |
| Player `.play-grid` | `1.5fr 0.8fr` | `26px` |
| Retreat | `1fr 1fr` | `42px` |
| Band CTA | `1.3fr 0.7fr` | `26px` |

### 4.4 Card & Component Padding

| Component | Padding |
|-----------|---------|
| Product card body | `18px 20px` |
| Tier card | `28px 26px` |
| Step card | `26px 24px` |
| Trust cell | `22px` |
| Testimonial | `26px` |
| Dashboard course | `20px 22px` |
| Enroll box / sidebox | `22–26px` |
| Auth card | `38px 34px` |
| Pane card (checkout) | `32px` |
| Modal | `32px` |
| Certificate | `50px 44px` |
| Band | `34px` |
| Footer | `46px 0 28px` |

### 4.5 Border Radius

| Element | Radius |
|---------|--------|
| Buttons | `40px` (pill) |
| Back button, chips, badges | `30px` |
| Cards (standard) | `14–16px` |
| Tier / enroll / pane cards | `18–20px` |
| Inputs | `10px` |
| FAQ items | `12px` |
| Summary / saved card | `12px` |
| Category pill on thumb | `20px` |
| Play button (small) | `50%` (42×42px) |
| Play button (large) | `50%` (74×74px) |
| Progress bar | `10px` |
| Icon circle (trust) | `50%` (36×36px) |
| Certificate seal | `50%` (60×60px) |

### 4.6 Sticky Elements

| Element | `top` offset |
|---------|--------------|
| Header | `0`, z-index `40` |
| Enroll box / sidebox | `90px` |

---

## 5. Borders & Shadows

| Pattern | Value |
|---------|-------|
| Default border | `1px solid var(--line)` |
| Featured tier | `2px solid var(--blue)` |
| Certificate | `2px solid var(--blue)` |
| Empty state | `1px dashed var(--line)` |
| Coupon | `1px dashed var(--green)` |
| Play button shadow | `0 10px 30px rgba(47,126,150,.35)` |
| Header | `border-bottom: 1px solid var(--line)` |
| Trust row | `border-top: 1px solid var(--line)` |

---

## 6. Interactive Elements

### 6.1 Buttons (`.btn`)

Base:
```
display: inline-block
font-family: body
font-weight: 700
font-size: 14.5px
padding: 12px 24px
border-radius: 40px
border: none
cursor: pointer
transition: transform 0.2s, background 0.2s
```

| Variant | Styles |
|---------|--------|
| **Primary** `.btn-primary` | bg `blue`, text white → hover `blue-deep` |
| **Ghost** `.btn-ghost` | transparent, ink text, `1.5px solid line` → hover border ink |
| **Block** `.btn-block` | `width: 100%`, text-center |
| **Small** (in cards) | `padding: 9px 18px` |
| **White on dark** (band) | bg white, text ink |
| **Capture CTA** | bg white, text `blue-deep` |

### 6.2 Back Button (`.backbtn`)

```
inline-flex, gap 4px
font-weight 700, 13.5px, ink-soft
bg white, border 1px line, radius 30px
padding 7px 14px
hover: border blue, text blue
```

### 6.3 Chips (`.chip`)

Dashboard action pills — upgrade, cancel, etc.:

```
font-size 12.5px, font-weight 600
padding 7px 14px
border 1px line, radius 30px
bg white, text ink-soft
hover: border blue, text blue
```

### 6.4 Form Inputs (`.input`)

```
width 100%
bg white, border 1px line, radius 10px
padding 12px 14px
font-size 15px, color ink, font-body
```

### 6.5 Form Field (`.field`)

```
margin-bottom 14px
text-align left
```

### 6.6 Checkbox Row (`.checkrow`)

```
flex, align-center, gap 8px
font-size 13px, ink-soft
margin 10px 0 18px
```

### 6.7 FAQ Accordion

- Item: white bg, line border, radius 12px, margin-bottom 10px
- Question: full-width button, padding 18px 22px, font-weight 700, 15.5px
- Icon: blue `+`, rotates 45° when `.open`
- Answer: max-height transition 0.3s, padding 0 22px 20px, ink-soft 14.5px

### 6.8 Modal Overlay (`.overlay`)

```
position fixed, inset 0
background rgba(31,58,67,.55)
z-index 80, padding 24px
display flex center (when .on)
```

### 6.9 Transitions

| Element | Duration |
|---------|----------|
| Buttons | `0.2s` (transform, background) |
| FAQ icon | `0.25s` (transform) |
| FAQ answer | `0.3s` (max-height) |
| Progress bar fill | `0.4s` (width) |

---

## 7. Component Inventory

Components below map 1:1 to HTML patterns. Build as React components in Sprint 1 (see `TASKS.md`).

### 7.1 Primitives

| Component | HTML class(es) | Notes |
|-----------|----------------|-------|
| `Button` | `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-block` | Variants: primary, ghost, block; sizes: default, sm |
| `Input` | `.input` | Text, email; used in forms and capture |
| `Label` | `.fl` | Form field label |
| `Field` | `.field` | Label + input wrapper |
| `CheckboxRow` | `.checkrow` | Consent, save card |
| `Badge` | `.plan-badge`, `.tier .badge`, `.pcard .cat` | Plan, featured, category |
| `Chip` | `.chip` | Dashboard quick actions |
| `Eyebrow` | `.eyebrow` | Section kicker text |
| `ProgressBar` | `.pbar`, `.pbar i` | 8px height, cream2 track, blue fill |
| `EmptyState` | `.empty` | Dashed border, centered muted text |
| `Disclaimer` | `.disc` | Cream2 bg, small legal copy |
| `CouponDisplay` | `.coupon` | Dashed green border, display font |

### 7.2 Layout

| Component | HTML class(es) | Notes |
|-----------|----------------|-------|
| `Container` | `.wrap` | max-width 1120px |
| `Ticker` | `.ticker` | Full-width green-deep announcement |
| `Header` | `header`, `nav` | Sticky, glass effect, 66px height |
| `Logo` | `.logo` | Display font; bold part in blue |
| `NavLinks` | `.navmid` | Center nav, 22px gap |
| `NavActions` | `.navright` | Socials + auth CTAs |
| `BackButton` | `.backbtn` | Contextual back navigation |
| `Footer` | `footer`, `.fgrid`, `.flinks` | Ink bg, logo + links + socials |
| `Section` | `section` | Vertical padding 54px |
| `SectionHeader` | `.center` + eyebrow + `.sh` + `.ss` | Centered section intro |
| `PageHeader` | `.dhead` | Dashboard title + subtitle + badge |
| `AuthLayout` | `.auth` | Blue-soft full-page centering |
| `AuthCard` | `.authcard` | White card, max 400px |
| `PaneLayout` | `.pane`, `.panecard` | Narrow centered forms (checkout) |

### 7.3 Marketing Sections

| Component | HTML class(es) | Used on |
|-----------|----------------|---------|
| `Hero` | `.hero`, `.hgrid` | Home |
| `TrustBar` | `.trust` | Below hero CTAs |
| `TrustGrid` | `.tgrid`, `.tcell` | Transformation benefits (4–5 cells) |
| `StepsGrid` | `.steps`, `.step` | 3-step how-it-works |
| `ProductCard` | `.pcard` | Programs, shop, course library |
| `PricingTiers` | `.tiers`, `.tier`, `.tier.feat` | 3 membership levels |
| `BandCta` | `.band`, `.band.green` | VIP package, retreats (dark/ green) |
| `TestimonialGrid` | `.testi`, `.tq` | 3 quote cards |
| `RetreatBlock` | `.retreat` | Image + copy side-by-side |
| `FaqAccordion` | `.faq-list`, `.faq-item` | FAQ section |
| `CaptureSection` | `.capture`, `.capform` | Email lead magnet (blue bg) |
| `ImagePlaceholder` | `.imgph` | Gradient placeholder for images |
| `CredentialPills` | `.creds span` | About page badges |
| `BlogCard` | `.blogcard` | Blog listing |
| `ArticleLayout` | `.article` | Long-form blog post |
| `AboutBlock` | `.about-block` | About page prose sections |

### 7.4 Course & Video

| Component | HTML class(es) | Notes |
|-----------|----------------|-------|
| `VideoPlaceholder` | `.video`, `.pl` | 16:9, gradient bg, play button |
| `PlayButton` | `.pl` | Small (42px) on cards; large (74px) on player |
| `CourseDetailGrid` | `.cd-grid` | Content + sticky enroll sidebar |
| `EnrollBox` | `.enroll-box` | Sticky pricing/join card |
| `LearnList` | `.learnlist` | Checkmark bullet list |
| `LessonRow` | `.lessonrow` | Static lesson list item |
| `PlayerGrid` | `.play-grid` | Video + lesson sidebar |
| `LessonList` | `.lessonlist`, `.li` | Interactive lesson nav with done state |
| `LessonDot` | `.dot` | Circle: empty → green check when done |
| `Sidebox` | `.sidebox` | Sticky progress + lesson list |

### 7.5 Commerce & Checkout

| Component | HTML class(es) | Notes |
|-----------|----------------|-------|
| `CheckoutSummary` | `.summary` | Blue-soft bar: item name + price |
| `SavedCard` | `.saved` | Green-soft, card icon + details |
| `Invoice` | `.invoice` | Post-payment receipt block |
| `InvoiceLine` | `.line`, `.tot` | Line items + total |
| `MailNote` | `.mailnote` | Green confirmation message |
| `SuccessTick` | `.tick` | Green circle checkmark (64px) |
| `ConsentForm` | consent view | Name, email, checkbox, disclaimer |

### 7.6 Dashboard & Member

| Component | HTML class(es) | Notes |
|-----------|----------------|-------|
| `DashboardLayout` | `.dash` | Member home |
| `PlanBadge` | `.plan-badge` | Green-soft member level pill |
| `ManageChips` | `.manage` | Subscription action chips |
| `SectionTitle` | `.lsec` | "Your programs" etc. |
| `DashboardCourse` | `.dcourse` | Course row with progress |
| `ProgressRow` | `.prow`, `.proj` | % complete + projected date |
| `Certificate` | `.cert` | Completion certificate layout |
| `CertificateSeal` | `.seal` | Blue circle with initial |
| `CertificateSig` | `.sig` | Date + instructor signature lines |

### 7.7 Modals & Overlays

| Component | HTML class(es) | Notes |
|-----------|----------------|-------|
| `Modal` | `.overlay`, `.modal` | Centered dialog |
| `ModalClose` | `.x` | Top-right dismiss |
| `DisclaimerModal` | `#ovDisclaimer` | Medical/educational disclaimer |
| `VideoModal` | `.videomodal` | Full-width video overlay |
| `UpgradeModal` | `.pop` | Completion → next level + coupon |

---

## 8. Page / View Map

The HTML demo uses single-page view switching (`.view.on`). Map to Next.js routes:

| View ID | Route (proposed) | Purpose |
|---------|------------------|---------|
| `home` | `/` | Marketing landing |
| `programs` | `/pricing` or `/programs` | Membership tiers + library |
| `course` | `/courses/[slug]` | Course detail + enroll |
| `consent` | `/checkout/consent` | Pre-payment consent step |
| `payment` | `/checkout/payment` | Payment (Stripe in prod) |
| `confirm` | `/checkout/confirmation` | Success + invoice |
| `dashboard` | `/dashboard` | Member home |
| `player` | `/dashboard/courses/[id]/watch` | Video player |
| `certificate` | `/dashboard/certificates/[id]` | Certificate view |
| `shop` | `/shop` | Digital products |
| `blog` | `/blog` | Blog listing |
| `article` | `/blog/[slug]` | Blog post |
| `about` | `/about` | Founder story |
| `login` | `/login` | Authentication |

**Lead form routes (from PRD, not in demo HTML):** `/vip`, `/retreats`, `/private-events`, `/free-taster`

**Admin routes (not in demo):** `/admin/*`

---

## 9. Section Background Patterns

Alternating backgrounds create visual rhythm:

| Pattern | Background |
|---------|------------|
| Default | `cream` |
| Alternate sections | `cream2` |
| Testimonials, entry offers | `blue-soft` |
| Capture CTA | `blue` (full color) |
| Auth page | `blue-soft` |
| Footer | `ink` |
| Dark band CTA | `ink` |
| Green band CTA | `green-deep` |

---

## 10. Imagery & Media

### 10.1 Placeholders (`.imgph`)

- Gradient: `blue-soft → green-soft`
- Border: `1px solid line`
- Radius: `16px` (14px in articles)
- Italic muted label text, centered

### 10.2 Aspect Ratios

| Context | Ratio |
|---------|-------|
| Hero image | `4/5`, min-height 330px |
| Card/blog thumb | `16/9` |
| Retreat image | `5/4`, min-height 300px |
| About portrait | `1/1.05`, min-height 340px |
| Article hero | `16/8`, min-height 220px |
| Video player | `16/9` |

### 10.3 Play Button Anatomy

Small (card thumb): 42×42px circle, blue bg, CSS triangle play icon (13px).

Large (player): 74×74px circle, blue bg, box-shadow, 22px triangle.

---

## 11. States & Feedback

| State | Visual treatment |
|-------|------------------|
| Nav link active | `.navmid a.on` → blue text |
| Tier featured | `2px blue border` + "Most popular" badge |
| Lesson complete | Green dot with check, muted text |
| Progress | Blue bar fill, percentage + lesson count |
| Projected completion | `.proj` green-deep, font-weight 600 |
| Form success | `.done` display font, white on capture bg |
| Saved card | Green-soft box with card icon |
| Empty dashboard | Dashed border, link to browse programs |
| Coupon applied | Summary shows "(10% off)" |
| Processing video | Use placeholder gradient until Mux ready |

---

## 12. Responsive Behavior

**Breakpoint:** `max-width: 860px`

| Layout | Desktop | Mobile |
|--------|---------|--------|
| Hero, course, player, retreat, band | 2 columns | 1 column |
| g3, g2, tiers, steps, testimonials | 3 columns | 1 column |
| Trust grid (tgrid) | 4 columns | 2 columns |
| Nav middle links | visible | hidden |
| Social links in header | visible | hidden |
| Enroll box / sidebox sticky | `top: 90px` | `position: static` |
| Band price column | right-aligned | left-aligned |
| Band feature list | 2 columns | 1 column |

**Mobile-first Tailwind approach:** Default single column; add `md:` / `lg:` for multi-column grids at ≥861px.

---

## 13. Accessibility Notes

Template gaps to address in React implementation:

- FAQ buttons need `aria-expanded` / `aria-controls`
- Modal needs `role="dialog"`, focus trap, `aria-modal`
- Form inputs need proper `<label htmlFor>` associations (template uses labels but some demo fields are `<div>`)
- Video player needs keyboard controls (Mux player provides this)
- Color contrast on `ink-soft` text should be verified against WCAG AA
- `user-select: none` on body in demo is for sample protection — **remove in production** (keep on non-input elements only if needed)
- Watermark overlay (`#wm`) is demo-only — **do not ship**

---

## 14. Content & Messaging Patterns

Recurring copy patterns to preserve:

| Pattern | Example |
|---------|---------|
| Medical disclaimer | "Educational content only · not medical advice" |
| Consent checkbox | Email + unsubscribe language |
| Checkout trust | "🔒 Secure encrypted checkout · powered by Stripe" |
| Post-purchase | "A receipt and invoice have been emailed…" |
| Membership meta | "X video lessons · materials · cancel anytime" |
| Empty state CTA | Link to browse programs |
| Back links | `← Back to …` in blue, font-weight 600, 14px |

---

## 15. Shadcn UI Mapping

Use Shadcn primitives styled with tokens above:

| Shadcn | Design system |
|--------|---------------|
| `Button` | `.btn` variants |
| `Input` | `.input` |
| `Label` | `.fl` |
| `Card` | `.pcard`, `.panecard`, `.dcourse` |
| `Badge` | `.plan-badge`, `.cat` |
| `Accordion` | `.faq-item` |
| `Dialog` | `.overlay` + `.modal` |
| `Progress` | `.pbar` |
| `Checkbox` | `.checkrow` |
| `Separator` | `border-line` |

Extend Shadcn theme in `components.json` to use brand colors from §2.4.

---

## 16. Implementation Checklist

When converting to React + Tailwind:

- [ ] Add Poppins + Mulish to `next/font`
- [ ] Extend `tailwind.config` with color tokens (§2.4)
- [ ] Add `font-display` and `font-body` utilities
- [ ] Build primitives (§7.1) before page assembly
- [ ] Build layout shell (§7.2) before marketing pages
- [ ] Map views to App Router routes (§8)
- [ ] Replace demo `user-select: none` and watermark
- [ ] Wire Stripe Checkout instead of demo payment form
- [ ] Wire Mux player instead of `.video` placeholder
- [ ] Replace "Wellness Studio" placeholder with client brand

---

## 17. Reference

- **Source file:** `docs/reference/Sample_Platform_Demo.html`
- **Related docs:** `AI_CONTEXT.md`, `.cursor/rules/ui.mdc`
- **Next task:** Sprint 1 in `TASKS.md` — build component library from this inventory
