# Slate n' Frame — Design System

Video production + social media management (SMMA) studio based in Serbia.
Tagline: **"VIDEO KOJI SE GLEDA DO KRAJA"** ("Videos you watch till the end").
Site is bilingual, Serbian (SR) default with an EN toggle. Tone: cinematic,
bold, modern, confident — a premium film studio, not a corporate agency.

**Sources provided:** `uploads/logo_off_white.png`, `uploads/logo_white.png`,
6 icon PNGs (`capture_icon`, `focus_icon`, `lens_icon`, `light_icon`,
`motion_icon`, `pulse_icon`), plus a written brand brief (colors, type,
tone, hard requirements). `uploads/Slate n Frame brand book.ai` was
**referenced but not actually present** in the uploads folder — it could not
be read. Everything here is built from the brief + the PNG assets only; if
the .ai brand book exists, re-attach it and I'll cross-check/extend this
system against it.

No Figma file, codebase, or existing site was provided — this is a
from-scratch brand-guidelines-only build. The component inventory (Button,
Link, Badge, Cards, Nav, Footer, Form fields, Section header, Animated
Icon) is therefore an authored standard set sized to what a studio
marketing site needs, not copied from an existing library.

---

## Content fundamentals

- **Voice:** confident, understated, cinematic. Says less, shows more —
  copy is a caption under the reel, not the headline act. The icons and
  motion carry the brand; text stays minimal and declarative.
- **Case:** headlines are ALWAYS UPPERCASE (set in the display face).
  Body copy and labels are sentence case. Never mix.
- **Person:** speaks as "we" (the studio) to "you" (the client) —
  "Radimo videe koje ljudi gledaju do kraja" / "We make videos people
  watch till the end," not third-person agency-speak.
- **Language:** Serbian (Latin script) is the default/primary language;
  English is a toggle, not a subtitle — both should read as native copy,
  not machine-translated mirrors of each other.
- **No emoji, ever.** No exclamation-point marketing energy, no stacked
  adjectives. One strong claim per section beats three qualified ones.
- **Tagline usage:** "Video koji se gleda do kraja" is the hero line and
  should appear large, once, uppercase, in the display face — it is the
  brand's thesis statement, not a recurring slogan to sprinkle everywhere.

## Visual foundations

- **Palette:** exactly 3 hues — charcoal `#2F2D2E` (primary background,
  ~90% of every screen), off-white `#F4F3ED` (ink/reverse-bg), rust orange
  `#EA693A` (accent only — one hero icon, one CTA, one focal detail per
  view; never a large fill). All tints/shades in `tokens/colors.css` are
  derived mathematically from these 3 — no new hues were introduced.
- **Type:** Uni Neue Black for ALL headlines
  — heavy, geometric, uppercase, tight leading (line-height ~0.96–1.1).
  DM Sans (300/400/500) for everything else — body, labels, nav, buttons.
  Only 2 typefaces, no exceptions.
- **Backgrounds — gritty, cinematic:** near-black charcoal fields carrying
  an always-on fine **film-grain** overlay (`tokens/texture.css`,
  `.snf-grain` / `.snf-grain-strong`, generated tile at
  `assets/textures/grain.png`) so surfaces read as graded footage, not a
  sterile UI. **Subtle gradients** are on-brand but disciplined — a soft
  **rust radial glow** (`--gradient-glow-rust`) behind hero/quote focal
  points, and functional **scrims** (`--gradient-scrim-*`) over imagery for
  legibility. Real **gritty B&W footage** (grayscale, high-contrast,
  motion-blurred — see `assets/imagery/`) is used full-bleed behind section
  dividers, pricing and closing moments, always darkened + grained. No
  illustration or decorative pattern.
- **Liquid glass:** a frosted translucent panel treatment
  (`.snf-glass` / `<GlassPanel>`: `backdrop-filter: blur+saturate`, 1px
  light border, soft diagonal highlight) for chrome that floats over
  footage/video — the sticky nav, pricing cards, badges on reels. Used
  sparingly as chrome, never as a full section background. This grit +
  gradient + glass trio is the signature surface language (drawn from the
  client's own pitch deck — see `ui_kits/slides/`).
- **Icons are the brand's visual motif** — see Iconography below. They
  replace what would otherwise be decorative illustration or pattern.
- **Motion:** the site is treated as one continuous reel. Standard
  easings: `--ease-out` for entrances/scroll-reveals, `--ease-in-out` for
  ambient/looping motion, `--ease-shutter` for mechanical snap-actions
  (the capture icon). No bounce, no elastic easings — bouncy motion reads
  as playful/consumer, this is a premium/cinematic brand. See Motion
  Principles below for full spec.
- **Hover states:** buttons/links lighten (rust → `--accent-hover`) on
  dark backgrounds, darken (`--accent-on-light-hover`) on light sections —
  never a color swap outside the accent family. Icons quicken their loop
  and gain a soft rust glow on hover. Links fill an underline from 0→100%
  width.
- **Press/active states:** darken further (`--accent-active`) — no scale/
  shrink on press; this brand doesn't do bouncy skeuomorphic feedback.
- **Borders:** hairline (1px), low-opacity off-white on dark surfaces
  (`--border-on-dark`, 10–36% opacity depending on emphasis), never a
  saturated color border except the deliberate rust focus ring.
- **Shadows:** soft, warm-neutral, low-opacity (`rgba(0,0,0,…)` only) —
  flat/matte elevation, never a colored or glassy shadow. Used sparingly,
  just enough to lift a card off the charcoal field.
- **Corner radii:** mostly square. The brandmark itself is built from hard
  rectangles and full circles with no in-between curve, so the UI follows:
  small consistent radius on buttons/inputs/cards (2–8px), full-round only
  for pills (badges, toggle) and the literal icon roundels.
  where UI text needs a rounded chip.
- **Transparency/blur:** used functionally, not decoratively — the sticky
  nav is a blurred charcoal scrim (`backdrop-filter: blur`) so it stays
  legible over video; badges over imagery get a blurred dark backing.
- **Imagery color vibe:** warm-neutral, slightly desaturated, matches the
  charcoal/off-white palette — footage/photography should feel graded, not
  raw-camera flat or cool/blue-tinted corporate stock.
- **Cards:** flat charcoal-800 surface, hairline border, small radius,
  soft shadow on hover-lift only (no shadow at rest) — see `ServiceCard`
  and `WorkCard`.
- **No scrolling marquee / keyword ticker anywhere** — explicitly rejected
  by the brand owner. Do not reintroduce one.

### Fonts
**Uni Neue Black** (Fontfabric) is the real licensed brand display font,
now self-hosted from `assets/fonts/UniNeueBlack.otf` and wired via
`@font-face` in `tokens/fonts.css`. **DM Sans** loads from Google Fonts.
Archivo Black remains only as a metric-similar fallback if the OTF fails.

## Iconography

The 6 custom icon motifs (Aperture, Lens, Motion, Pulse, Light, Capture)
are the centerpiece of this brand — not decorative accents. Source PNGs
(off-white silhouettes, transparent background) are in `assets/icons/`,
copied as-provided (not redrawn). No icon font, no emoji, no generic
icon library (Lucide/Heroicons/etc.) is used anywhere in this system —
only these 6 bespoke shapes.

They're rendered as real `<img>` tags from pre-tinted PNG variants
(`<icon>-off-white.png` / `-rust.png` / `-charcoal.png`, generated from the
provided off-white masters) so a single motif can appear in any of the 3
brand colors and survives every render path — screenshot, PDF, PPTX —
without the clipping failures a CSS `mask-image` recolor hits.

**Every icon is always animated** — looping, subtle, premium, never
static. Full per-icon motion spec (rotation direction, easing, timing) is
documented in `components/icons/AnimatedIcon.prompt.md` and implemented
in `tokens/icon-motion.css`. Sizes run from `sm` (28px, inline with a
label) up to `hero` (340px, dominant section-anchor scale) — see
`guidelines/icon-scale.card.html`.

## Visual foundations — cont'd: motion principles

- **Durations:** `--dur-instant` 120ms (press feedback) → `--dur-reveal`
  900ms (section scroll-reveal). Icon loops run 4–12s depending on motif.
- **Scroll reveals:** content fades up `--reveal-distance` (28px) with
  `--ease-out`, staggered `--reveal-stagger` (90ms) per child.
- **Page transitions:** cross-fade only (no slides/wipes) at `--dur-slow`.
- **Nothing is ever fully static** — even resting sections carry icon
  motion; this is what makes the site read as "one continuous reel"
  rather than a stack of static screens.

## Layout concept — site section order

1. **Hero** — full-bleed charcoal, hero-scale (`hero`, 340px) Aperture
   icon centered or right-aligned behind/beside the tagline, slow ambient
   rotation + breathing scale. Nav sticky on top.
2. **Services** — `SectionHeader` (Lens icon) + grid of `ServiceCard`s,
   each anchored by a `lg` (96px) icon matched to that service.
3. **Work / Portfolio** — `SectionHeader` (Capture icon) + `WorkCard` grid
   (case studies/reels), 4:5 portrait tiles matching social-native video.
4. **About / Process** — `SectionHeader` (Motion icon) + process steps,
   each step optionally paired with a `md` icon; Pulse icon works well
   here to represent "editing rhythm."
5. **Contact** — `SectionHeader` (Light icon, "let's talk") + `FormField`
   contact form, large ambient Light icon (sunburst) drifting behind the
   form at low opacity as the section's light source.
6. **Footer** — wordmark, nav, contact, socials, legal bar.

See `ui_kits/website/index.html` for the built-out version of this flow.

---

## Index

- `styles.css` — root stylesheet, `@import`s everything below.
- `tokens/` — `colors.css`, `fonts.css`, `typography.css`, `spacing.css`,
  `radii.css`, `motion.css`, `icon-motion.css`.
- `assets/logo/` — `logo-off-white.png`, `logo-white.png`.
- `assets/icons/` — `aperture.png`, `lens.png`, `motion.png`, `pulse.png`,
  `light.png`, `capture.png`.
- `tokens/texture.css` — grain, gradient and liquid-glass tokens + utility
  classes (`.snf-grain`, `.snf-glass`).
- `assets/textures/grain.png` — grain noise tile. `assets/imagery/` — sample
  gritty B&W footage.
- `components/`
  - `icons/AnimatedIcon.jsx` — the 6-motif animated icon system (see above).
  - `core/Button.jsx`, `Link.jsx`, `Badge.jsx`, `SectionHeader.jsx`, `GlassPanel.jsx`.
  - `cards/ServiceCard.jsx`, `WorkCard.jsx`.
  - `navigation/NavHeader.jsx`, `Footer.jsx`.
  - `forms/FormField.jsx`.
- `guidelines/` — foundation specimen cards (color/type/spacing/icon-scale,
  grain/gradients/glass).
- `ui_kits/website/` — full click-through homepage recreation.
- `ui_kits/slides/` — pitch-deck slide kit (8 slide types) rebuilding the
  client's deck on the brand system: grain + rust glow + liquid-glass cards.

**Components:** AnimatedIcon, Button, Link, Badge, SectionHeader,
GlassPanel, ServiceCard, WorkCard, NavHeader, Footer, FormField.
- `SKILL.md` — Claude Code-compatible skill wrapper for this system.

## Intentional additions

No source component library was provided, so the full component set above
is an authored addition sized to a studio marketing site's needs (not a
recreation of an existing kit). Noted here per design-system convention
rather than under each component individually.

## Caveats

- `Slate n Frame brand book.ai` was referenced in the request but not
  present in `uploads/` — could not be read. Please re-attach if it exists.
- No codebase/Figma was attached, so components and the UI kit are
  original layout work built strictly from the fixed brand spec, not a
  recreation of an existing site.
