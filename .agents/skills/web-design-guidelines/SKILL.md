---
name: web-design-guidelines
description: |
  Review UI code for Web Interface Guidelines compliance by the Vercel engineering team. Covers layout, typography, color, motion, focus states, and accessibility for modern web UI.
triggers:
  - "web design guidelines"
  - "vercel design"
  - "product ui standards"
  - "design checklist"
  - "review my UI"
  - "check accessibility"
  - "audit design"
  - "review UX"
  - "kiểm tra ui"
  - "audit giao diện"
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review UI code and frontend components for compliance with Vercel Web Interface Guidelines.

## How It Works

1. Load the pinned guidelines from [`references/guidelines.md`](references/guidelines.md)
2. Read the specified UI / frontend files (React, Vue, HTML, CSS, Tailwind)
3. Check against all rules in the guidelines:
   - **Accessibility**: Button ARIA labels, semantic tags, keyboard navigability, image alts.
   - **Focus States**: Visible `:focus-visible:ring-*`, no naked `outline: none`.
   - **Forms**: Labels, autocomplete, validation, inputmode.
   - **Typography & Motion**: Line heights, contrast ratios, reduced motion support.
4. Output findings in a concise, actionable format with line numbers and concrete code-level fixes.
