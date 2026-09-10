---
name: ui-skills
description: >
  Opinionated, evolving UI constraints to guide agents when building modern web interfaces.
  Enforces clean typography hierarchy, spatial rhythm, micro-interactions, and anti-slop polish pass.
triggers:
  - "ui skills"
  - "baseline ui"
  - "ui constraints"
  - "ui polish"
  - "deslop ui"
  - "tinh chỉnh giao diện"
  - "tối ưu ui"
od:
  mode: design-system
  category: design-systems
  upstream: "https://github.com/ibelick/ui-skills"
---

# UI Skills & Baseline Constraints

Enforces an opinionated, production-grade UI baseline to prevent AI-generated interface slop and ensure premium visual execution.

---

## 1. Stack & Primitives

- **Styling**: MUST use Tailwind CSS defaults. Avoid ad-hoc arbitrary values like `p-[17px]` when `p-4` or `p-5` exists.
- **Animation**:
  - Prefer CSS transitions for hover/focus: `transition-colors duration-150` or `transition-transform duration-200`.
  - Use `motion/react` (formerly `framer-motion`) when layout animations, exit animations, or physics springs are required.
- **Component Primitives**:
  - Never use `<div onClick="...">` for interactive controls. Always use `<button type="button">` or `<a href="...">`.
  - Accessible primitives: Radix UI, Headless UI, or shadcn/ui patterns.
  - Class merge: Always use `cn(...)` (`clsx` + `tailwind-merge`) when conditionally composing classes.

---

## 2. Spacing & Spatial Rhythm

- Stick strictly to the standard spacing scale: `1` (4px), `2` (8px), `3` (12px), `4` (16px), `6` (24px), `8` (32px), `12` (48px), `16` (64px).
- Internal element padding must always be smaller than card outer padding:
  - Card: `p-6` (24px) $\rightarrow$ Inner badge: `px-2.5 py-0.5` $\rightarrow$ Item row: `p-3`.
- Align icons vertically with text using `flex items-center gap-2`. Never let icons float unaligned.

---

## 3. Typography & Color Balance

- **Type Scale**:
  - Display: `text-4xl` to `text-6xl font-bold tracking-tight`.
  - Section Headings: `text-2xl` or `text-3xl font-semibold tracking-tight`.
  - Subheadings: `text-lg font-medium text-muted-foreground`.
  - Body: `text-sm` or `text-base leading-relaxed text-foreground`.
  - Metadata / Microcopy: `text-xs font-medium text-muted-foreground tracking-wide uppercase`.
- **Contrast & Surface Hierarchy**:
  - Background 0 (canvas): `bg-background`
  - Background 1 (card/surface): `bg-card` or `bg-white dark:bg-zinc-900`
  - Background 2 (subtle/hover): `bg-muted` or `bg-zinc-50 dark:bg-zinc-800/50`
  - Border: `border border-border/70 dark:border-zinc-800`

---

## 4. Micro-Interactions & Polish Pass

- Every clickable element must provide feedback:
  - Hover: `hover:bg-accent hover:text-accent-foreground` or subtle elevation.
  - Active/Press: `active:scale-[0.98]` or `active:translate-y-[1px]`.
  - Focus: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.
  - Disabled: `disabled:opacity-50 disabled:pointer-events-none`.
- Skeleton loaders: Match the exact layout proportions rather than full-page spinners during loading.
