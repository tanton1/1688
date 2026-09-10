---
name: create-design-md
description: >
  Create or update a DESIGN.md design system contract from an existing product repository or public website (e.g. macorner.co).
  Extracts design tokens, typography scales, color palettes, component patterns, and visual rules to give coding agents
  persistent UI context.
triggers:
  - "create design md"
  - "create-design-md"
  - "extract design system"
  - "generate design.md"
  - "design system contract"
  - "trích xuất design system"
  - "tạo design.md"
---

# Create DESIGN.md

Create a `DESIGN.md` file for a product or website. Record the core design system and visual rules that govern the interface, establishing a persistent contract for all future development.

---

## 1. Extraction Workflow

### From a Public Website (e.g., macorner.co, competitor sites):
1. Analyze color palette: Primary brand color, secondary accents, background tone, borders, text contrast.
2. Analyze typography: Font families (headings vs body), weights, line heights, letter spacing (`tracking`).
3. Analyze key components:
   - Header & Navigation (announcement strip, logo positioning, search, cart icon with badge).
   - Product Grid / Card (aspect ratio, badges like "Best Seller" or "-30%", hover image swap, star rating).
   - Product Detail Page (gallery thumbnail position, variant pill buttons, quantity stepper, sticky Buy button).
   - Trust Signals & Badges (shipping guarantees, secure payment logos, reviews count).
4. Record spatial rules: Container max-width, grid gaps, padding rhythm.

---

## 2. Standard `DESIGN.md` Structure

The generated `DESIGN.md` must follow this schema:

```markdown
# Design System & Guidelines: [Product Name]

## 1. Brand Identity & Visual Language
- **Tone & Persona**: (e.g. Modern, warm, approachable, high-converting e-commerce)
- **Visual Aesthetic**: (e.g. Clean white canvas, subtle borders, high-contrast CTAs)

## 2. Color Palette & Design Tokens
- **Backgrounds**: Canvas (\`#F9FAFB\`), Card surface (\`#FFFFFF\`), Alt section (\`#F3F4F6\`)
- **Primary / Brand**: (\`#... \` e.g., Burgundy, Coral, or Deep Indigo)
- **Secondary / Accents**: Highlight badges, star ratings (\`#FBBF24\`), discount tags (\`#EF4444\`)
- **Text**: Primary (\`#111827\`), Secondary (\`#4B5563\`), Muted (\`#9CA3AF\`)
- **Borders**: Hairline (\`#E5E7EB\`)

## 3. Typography
- **Headings**: Family, size scale, weight (\`font-bold\`, \`tracking-tight\`)
- **Body & Microcopy**: Family, line height (\`leading-relaxed\`), micro-badges (\`text-xs uppercase\`)

## 4. Spatial Rhythm & Grid
- **Container**: Max width \`max-w-7xl\`, horizontal padding \`px-4 sm:px-6 lg:px-8\`
- **Grid Layouts**: Product grid (\`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6\`)

## 5. Core Components & Interaction Patterns
- **Buttons**: Primary (\`bg-primary text-white rounded-full py-3.5 px-8 font-semibold shadow-sm hover:opacity-90\`)
- **Cards**: Product card with 1:1 or 3:4 image ratio, hover zoom, quick action triggers
- **Navigation**: Sticky header with blur backdrop (\`backdrop-blur-md bg-white/90\`)

## 6. Accessibility & Responsiveness
- Touch targets $\ge 44 \times 44$px on mobile.
- Zero horizontal overflow.
- High contrast focus rings.
```
