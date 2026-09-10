---
name: open-design
description: >
  The official OpenDesign vibe design engine for Antigravity. Crafts world-class UI/UX,
  landing pages, interactive web prototypes, e-commerce storefronts, and brand design systems.
  Implements Atelier Zero, modern editorial layouts, high-converting product showcases,
  and anti-slop frontend engineering.
triggers:
  - "open design"
  - "opendesign"
  - "vibe design"
  - "design landing page"
  - "thiet ke giao dien"
  - "design ui"
  - "atelier zero"
  - "editorial layout"
  - "design prototype"
  - "design hero"
  - "tạo giao diện"
od:
  category: creative-direction
  surface: web
  platform: desktop
  scenario: product-and-marketing
  craft:
    requires:
      - pixel-discipline
      - typographic-rhythm
      - anti-slop
---

# OpenDesign Vibe Design Engine

OpenDesign turns the AI agent into an expert UI/UX designer and creative director capable of designing world-class web experiences, marketing landing pages, and interactive product interfaces without needing Figma.

---

## 1. Core Visual Philosophies

### Atelier Zero (OpenDesign Signature Aesthetic)
- **Background**: Warm cream/paper textures (`#FAF8F5`, `#F6F4EE`, `#0F0E0D` in dark mode) instead of harsh `#FFFFFF` or sterile `#000000`.
- **Typography Pairing**:
  - Headings: Editorial serif (Playfair Display, Instrument Serif, Cormorant) or condensed high-impact sans (Inter Tight, Syne).
  - Body & UI: Ultra-legible grotesque sans (Inter, Geist, Satoshi, Plus Jakarta Sans) with tracking adjustments (`tracking-tight` on titles, `tracking-normal` on body).
  - Accent Spans: Italicized serif emphasis spans (`<em class="font-serif italic text-primary">...</em>`) for editorial rhythm.
- **Accents & Terminating Elements**: Dotted hairline borders (`border-dotted border-border/80`), subtle coral/terracotta or emerald punctum dots (`bg-[#FF5533]`), coordinates/volume metadata stamps.
- **Motion**: Subtle scroll reveals (`translate-y-4` to `translate-y-0`, `opacity-0` to `opacity-100` via CSS transitions or GSAP / Framer Motion).

### Anti-Slop Discipline
- **NEVER** use generic purple-to-cyan gradient blobs on pure black.
- **NEVER** use centered floating cards with generic rounded corners (`rounded-3xl shadow-2xl`) and no semantic context.
- **NEVER** use emojis as primary navigational or structural icons — use Lucide / SVG icons.
- **NEVER** write generic lorem ipsum — write real, persuasive, brand-specific microcopy.

---

## 2. Spatial Hierarchy & Spacing Rhythm

Follow the 8pt spatial baseline:
- `gap-2` (8px), `gap-4` (16px), `gap-6` (24px), `gap-8` (32px), `gap-12` (48px), `gap-16` (64px), `gap-24` (96px).
- Container bounds: Maximum readable width for text is `max-w-2xl` to `max-w-3xl` (~65–75ch). Full-width hero sections bound within `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
- Component padding:
  - Buttons: `px-5 py-2.5` or `px-6 py-3`, font-medium, rounded-full or rounded-lg.
  - Cards: `p-6` to `p-8`, subtle borders (`border border-black/[0.08] dark:border-white/[0.08]`), soft elevation or flat with border distinction.

---

## 3. Standard Interface Architecture

When designing a complete surface (Landing Page, Storefront, Dashboard):

1. **Top Bar / Meta Header**:
   - Volume / Issue / Date / Currency / Language switcher or Announcement strip.
2. **Sticky Navigation Bar**:
   - Clean logo / brand mark on the left.
   - Categorical links in center with active indicator.
   - Right-side actions: Search bar, Currency/Cart trigger with badge count, and primary CTA.
3. **Hero Section (High Impact)**:
   - High signal headline (Kicker + Big Title + Concise Subtitle).
   - Dynamic collage, 3D render, or interactive product preview.
   - Dual CTAs: Primary action (e.g., "Mua ngay", "Khám phá bộ sưu tập") + Secondary action (e.g., "Xem video", "Đánh giá 4.9/5").
   - Social proof bar: Real metrics, media logos, or trust badges.
4. **Interactive Bento Grid / Feature Showcase**:
   - Asymmetric bento grid (1 large card + 2-3 smaller cards).
   - Real interactive states (hover lift, image zoom, live badge updates).
5. **Product / Catalog Showcase**:
   - High-fidelity product cards with secondary image on hover, quick add to cart, rating stars, price discount tag.
6. **Social Proof & Reviews**:
   - Authentic customer photos / video UGC cards, verified badges, rating breakdown.
7. **Closing CTA & Editorial Footer**:
   - High contrast closing block.
   - Multi-column footer with newsletter signup, payment method icons, legal & copyright.

---

## 4. Image & Asset Generation Rules

When generating visuals for designs using AI (`gpt-image-2`, DALL-E, or fal):
- Specify camera, lighting, and composition:
  - *"Studio product photography, 85mm lens, soft diffuse lighting, neutral linen background, minimalist styling, high-end e-commerce editorial"*.
- Never ask for text rendered inside the image — overlay all text using HTML/CSS.
- Always provide fallback SVG placeholders if image generation is unavailable.

---

## 5. Pre-Delivery Design Audit

Before delivering any UI component or page:
- [ ] Contrast ratio meets WCAG AA (4.5:1 for body text, 3:1 for large headers).
- [ ] Hover, active, and focus-visible states exist for all interactive elements.
- [ ] Mobile responsive: zero horizontal scrolling at 375px width.
- [ ] Semantic HTML: `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>`, `<button>`.
