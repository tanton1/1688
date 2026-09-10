---
name: ui-ux-pro-max
description: >
  Comprehensive UI/UX design heuristics, professional rules, component states, and pre-delivery checklist.
  Use when designing complex web apps, mobile responsive surfaces, or auditing UI for professional production quality.
triggers:
  - "ui ux pro max"
  - "ui ux patterns"
  - "design patterns"
  - "ux heuristics"
  - "usability"
  - "pre delivery checklist"
  - "kiểm tra ux"
  - "chuẩn ux"
od:
  mode: design-system
  category: design-systems
  upstream: "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill"
---

# UI/UX Pro Max

Professional UI/UX heuristics, interaction standards, and comprehensive quality gates.

---

## 1. Core Heuristics & Rules

Consult [`references/pro-rules.md`](references/pro-rules.md) for the full matrix of professional standards:

- **Icons & Visual Elements**:
  - Always use SVG / Lucide vector icons. Never use emojis for navigation or structural controls.
  - Consistent icon stroke width (e.g. `1.5` or `2.0` throughout the app).
- **Hit & Touch Targets**:
  - Minimum touch target for all interactive elements is $44 \times 44$px on mobile devices (`min-h-[44px] min-w-[44px]` or padding expansion).
- **Form Controls & Inputs**:
  - Input labels must be persistently visible or use floating labels (never rely solely on placeholder text which disappears on typing).
  - Explicit error messages positioned directly beneath the offending input, styled with high contrast red/rose text and alert icon.
  - Inputs must declare appropriate `autocomplete` and `type` attributes.
- **Loading & Empty States**:
  - Empty states must include an illustrative icon/graphic, explanatory text, and a primary call-to-action button (e.g., "Chưa có sản phẩm nào trong giỏ hàng $\rightarrow$ Tiếp tục mua sắm").
  - Content skeleton screens matching final layout shape instead of indefinite spinners.

---

## 2. Pre-Delivery Checklist

Before finalizing any frontend surface:
1. **Interactive States**: Default, Hover, Focus-visible, Active/Pressed, Disabled, Loading.
2. **Color Contrast**: 4.5:1 ratio minimum against canvas.
3. **Information Density**: Proper hierarchy; important actions (Buy, Submit, Save) dominate secondary actions (Cancel, Back).
4. **Resilience**: Text wrapping tested with long product titles, currency symbols, and multi-line descriptions.
