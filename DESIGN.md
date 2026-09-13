# Design System & Guidelines: Macorner Storefront

## 1. Context and goals

Design intent: Macorner must make discovering, personalizing, and purchasing a meaningful gift feel fast, trustworthy, and unmistakably clear on every viewport.

- The storefront must prioritize product discovery, variation selection, personalization preview, price clarity, and purchase confidence.
- The UI must conform to WCAG 2.2 AA and must support keyboard-first operation.
- Teams must prefer shared tokens and component contracts over local visual exceptions.
- The catalog architecture must remain usable at the observed page density of approximately 742 links, 170 cards, 53 lists, 26 buttons, 15 inputs, and one primary navigation region.
- Listing pages must use server filtering and pagination rather than rendering the full catalog at once.
- Variation, personalization, and attributes must remain separate data concepts:

| Concept | Purpose | May affect price/stock | Stored as |
| --- | --- | --- | --- |
| Variation | A sellable SKU choice such as style, size, color, or capacity | Yes | Variant/SKU data |
| Personalization | Customer-provided name, image, message, avatar, or asset selection | Only through explicit add-ons | Order-line configuration data |
| Attribute | Read-only product facts such as material or print method | No | Product specification data |

## 2. Brand identity and visual language

- Tone and persona must be warm, confident, concise, and implementation-focused.
- The visual aesthetic must use a high-contrast monochrome foundation with a warm orange action accent.
- Surfaces should feel clean and editorial; product imagery and personalization previews should carry the emotional weight.
- Dense controls must remain structured through grouping, whitespace, and progressive disclosure rather than reduced target sizes.
- Decorative motion should be restrained and must never block input or obscure content.

## 3. Design tokens and foundations

### 3.1 Primitive values

Raw values may be declared only in the token source. Components must consume the semantic token names below.

| Token | Value |
| --- | --- |
| `font.family.primary` | `Geist` |
| `font.family.stack` | `Geist, system-ui, sans-serif` |
| `font.size.xs` | `12px` |
| `font.size.sm` | `14px` |
| `font.size.md` | `16px` |
| `font.size.lg` | `20px` |
| `font.size.xl` | `30px` |
| `font.size.2xl` | `36px` |
| `font.size.3xl` | `45px` |
| `font.weight.base` | `400` |
| `font.lineHeight.base` | `24px` |
| `color.border.default` | `#312b36` |
| `color.surface.base` | `#000000` |
| `color.surface.strong` | `#ffffff` |
| `color.surface.canvas` | `#f4f1eb` |
| `color.surface.subtle` | `#ece8e0` |
| `color.surface.muted` | `#331400` |
| `color.text.primary` | `#000000` |
| `color.text.secondary` | `#665e5c` |
| `color.text.tertiary` | `#faf8f5` |
| `color.accent` | `#ed6a22` |
| `color.accent.strong` | `#c94f11` |
| `space.1` | `4px` |
| `space.2` | `6px` |
| `space.3` | `8px` |
| `space.4` | `10px` |
| `space.5` | `12px` |
| `space.6` | `16px` |
| `space.7` | `18px` |
| `space.8` | `56px` |
| `radius.xs` | `8px` |
| `radius.sm` | `50px` |
| `radius.md` | `999px` |
| `radius.lg` | `9999px` |
| `motion.duration.instant` | `200ms` |

### 3.2 Semantic aliases

- `surface.page` must map to `color.surface.canvas`.
- `surface.card` must map to `color.surface.strong`.
- `surface.inverse` must map to `color.surface.base`.
- `surface.selected` should use a low-opacity tint of `color.accent`.
- `text.default` must map to `color.text.primary`.
- `text.muted` must map to `color.text.secondary`.
- `text.onInverse` must map to `color.text.tertiary`.
- `text.action` must map to `color.accent.strong`; `color.accent` must not be used for small text on white.
- `action.primary` must map to `color.accent.strong`.
- `action.primary.hover` must map to `color.surface.muted`.
- `border.default` must derive from `color.border.default` with the shared opacity scale.
- `focus.ring` must map to `color.accent` and must render as a 3px visible outline with at least 2px offset where clipping is possible.
- `shadow.soft` and `shadow.lift` must use the shared storefront shadow tokens.

### 3.3 Typography

- Body copy must use `font.family.stack`, `font.size.md`, `font.weight.base`, and `font.lineHeight.base` unless a defined scale token applies.
- Product names should use `font.size.sm` or `font.size.lg` depending on context and must use a minimum weight of 700.
- Prices must use tabular numerals where available and should use `text.action` for prominence.
- Eyebrows may use `font.size.xs`, uppercase text, and increased tracking, but must not replace a semantic heading.
- Text must resize to 200% without truncating required controls or hiding information.

### 3.4 Spatial rhythm and grid

- Page containers must use a shared maximum width equivalent to `max-w-7xl` with horizontal padding of `space.6` on compact screens and `space.8` at large breakpoints.
- Product grids must use two columns on compact screens, three columns on medium screens, and four columns on wide screens when space permits.
- Product grid gaps must use only the shared spacing scale.
- Product media must use a consistent square aspect ratio unless the product family explicitly requires a documented alternate ratio.
- Touch targets must be at least 44 by 44 CSS pixels.
- Layouts must not introduce horizontal page scrolling at 320px viewport width.

## 4. Component-level rules

### 4.1 Announcement header, search, and navigation

Anatomy: announcement strip, brand link, primary navigation, search field, order tracking, cart, and admin return action.

- The header must remain visible while scrolling and must preserve one primary `navigation` landmark.
- Search must use a visible label or accessible name and should debounce requests by approximately 300ms.
- Search, filters, and sorting must persist in the URL.
- Long brand taglines must truncate visually without changing the accessible name.
- Compact navigation must collapse into the shared mobile bottom navigation; it must not duplicate focusable controls off-screen.

States:

- Default must expose all primary actions with `text.default` or `text.onInverse` contrast.
- Hover must change color or surface without moving layout.
- Focus-visible must render `focus.ring` around the complete interactive target.
- Active must provide an immediate pressed response within `motion.duration.instant`.
- Disabled must remain visible, must expose `disabled`, and must not respond to pointer or keyboard input.
- Loading must mark the affected control `aria-busy="true"` and must retain its accessible name.
- Error must show a visible status message associated with search or navigation data failure.

Interaction:

- `Tab` and `Shift+Tab` must follow visual order.
- `Enter` must activate links and buttons; `Space` must activate buttons.
- Pointer and touch must activate the same destination and must not rely on hover-only content.

### 4.2 Collection filters and sorting

Anatomy: collection, price, occasion, recipient, personalization toggle, sort selector, reset action, result count, and mobile filter sheet.

- Desktop filters must render in a complementary landmark.
- Mobile filters must use a modal sheet with a programmatic name, focus trap, Escape close, backdrop close, and focus restoration.
- Only one option in each single-select group should be pressed at a time.
- Applying a filter must reset pagination to page one.
- Empty option groups must be omitted rather than rendered as empty boxes.
- Very long option labels must wrap to two lines or truncate with the full accessible name retained.

States:

- Default must distinguish group labels and available options.
- Hover must highlight enabled options.
- Focus-visible must use `focus.ring`.
- Active must use a pressed response and must update `aria-pressed` or the native selected state.
- Disabled must use native `disabled` and must explain unavailable filters when necessary.
- Loading must keep the current results visible, mark the results region busy, and disable duplicate submissions.
- Error must preserve the selected filters and show a retry action.

### 4.3 Product card

Anatomy: primary image, optional secondary image, badges, category, rating, title, discount note, price range, detail action, and quick-add action.

- The card must not nest one interactive control inside another.
- The detail action and quick-add action must be separate focusable controls.
- Secondary-image hover must be decorative; the primary image and product name must remain understandable without hover.
- Product titles should clamp to two lines visually while retaining their full accessible name.
- Missing images must render a named fallback state.
- Personalized products must open the PDP instead of bypassing required configuration through quick add.

States:

- Default must show title, sellable price, and primary image or fallback.
- Hover should lift with `shadow.lift` and may crossfade the secondary image.
- Focus-visible must outline the focused action, not the entire unrelated card surface.
- Active must remove lift and show a pressed response.
- Disabled must communicate out-of-stock status and disable quick add.
- Loading must show stable media/card geometry and a labeled skeleton or status.
- Error must show a retryable media fallback without removing product text.

### 4.4 Pagination and result states

- The first catalog request must use server-side filters, sorting, and pagination.
- “Load more” must request only the next server page and must append without duplicating product IDs.
- Empty results must explain which filter context produced no matches and must offer a reset action.
- Long result sets must not be announced item by item; the updated count should use one polite live region.

States:

- Default must show the current result count.
- Hover and active must be defined for the load-more and reset actions.
- Focus-visible must use `focus.ring`.
- Disabled must apply when no further page exists.
- Loading must label the control “Đang tải thêm…” and set `aria-busy`.
- Error must keep the existing products visible and provide retry.

### 4.5 Product media gallery and lightbox

Anatomy: main media, mockup preview, video, thumbnail list, personalization badge, zoom action, lightbox, and media error fallback.

- Every thumbnail must be a button with an accessible label and `aria-pressed` state.
- The lightbox must use dialog semantics, trap focus, close with Escape, and return focus to the zoom trigger.
- The personalized mockup lightbox must display the generated preview rather than an unrelated source image.
- Missing or blocked images must render a named fallback without collapsing the media area.
- Oversized media must use contain behavior inside the lightbox and must not overflow the viewport.

States:

- Default must show the selected media.
- Hover may zoom the image slightly but must not be the only zoom affordance.
- Focus-visible must use `focus.ring` on thumbnails and zoom controls.
- Active must update `aria-pressed` and the main media immediately.
- Disabled must apply to zoom when no valid image is available.
- Loading must retain aspect ratio and expose a polite status when delayed.
- Error must show the `ImageOff` fallback and leave alternate thumbnails operable.

### 4.6 Variation selector

Anatomy: group legend, option buttons, optional swatch/image, selected SKU summary, price, stock, and availability.

- Each variation group must use `fieldset` and `legend` or equivalent named group semantics.
- Options must map to commercial SKU data only.
- Selecting one option must preserve compatible selections where possible and must resolve to an existing SKU.
- Impossible combinations must be disabled and must never create a synthetic SKU.
- Selection changes must update price, stock, image/mockup, and selected summary from the resolved SKU.
- Long option lists must wrap or use a bounded scroll area while retaining 44px targets.

States:

- Default must show available options.
- Hover must highlight only enabled options.
- Focus-visible must use `focus.ring`.
- Active must set `aria-pressed="true"` and update the SKU summary in a polite live region.
- Disabled must use native `disabled`, muted styling, and a visible unavailable treatment.
- Loading must prevent purchase while SKU price or stock is unresolved.
- Error must state that the combination is unavailable and keep the last valid SKU selected.

### 4.7 Personalization editor

Anatomy: progress, ordered fields, text/select/upload/asset controls, help text, field errors, draft status, canvas preview, scenes, print areas, ordered layers, and configuration identifier.

- Personalization must remain separate from the variation selector and must not generate new SKU combinations.
- Required fields must be validated before cart or buy-now actions proceed.
- Uploaded images must be validated by actual file bytes, size, and dimensions on the server.
- Live deployments must persist preview media before checkout; demo mode must not call unavailable persistence services.
- Draft values should persist per product and SKU on the current device.
- Conditional and repeat-group fields must validate only when visible and applicable.
- Empty schemas must show a configuration notice rather than a blank editor.
- Preview failure must not erase entered customer data.
- Each listing should declare an `idea` preset (photo gift, design choice, name/text, avatar, pet, multi-person, or custom) so the customer flow matches the product concept.
- Mockup scenes must be independent per listing; each scene may provide a base mockup and optional `variantMockupUrls` overrides for physical SKUs.
- Print areas must use percentage coordinates, an explicit shape/fit, optional safe zone, and optional field bindings. A field bound to an area must render only inside that area.
- Canvas layers must define source (`FIELD`, `VARIANT_DESIGN`, or `VARIANT_COLOR`), print-area mapping, scene scope, and z-index so a design SKU and a customer upload can be composited deterministically.
- The admin editor must expose direct drag/resize handles and a SKU preview selector; saving the listing must preserve the canvas snapshot with the product and order line.

States:

- Default must show progress and field instructions.
- Hover must be defined for asset options and upload actions.
- Focus-visible must use `focus.ring` or an equivalent 3px high-contrast ring.
- Active must identify chosen assets with `aria-pressed` or native selected state.
- Disabled must apply during uploads and when repeat limits are reached.
- Loading must announce upload or preview work and prevent duplicate purchase submission.
- Error must be shown adjacent to the field with `role="alert"`; the purchase-level summary must also explain missing required data.

### 4.8 Quantity, add-ons, and purchase actions

- Quantity must remain between one and the selected SKU stock.
- Add-ons must use native checkboxes and must update the displayed total.
- Price sent by the browser must never be trusted by checkout; the server must recalculate price, discount, add-ons, and stock.
- Primary actions must remain in document flow; the compact sticky purchase bar must appear only after those actions have passed above the viewport.
- Purchase labels must be descriptive: “Thêm vào giỏ” and “Mua ngay”; ambiguous labels such as “Tiếp tục” must not be used without context.

States:

- Default must show current quantity, selected variant, and total.
- Hover must use semantic action colors.
- Focus-visible must use `focus.ring`.
- Active must show a pressed response within `motion.duration.instant`.
- Disabled must apply for zero stock, unresolved SKU, or active submission.
- Loading must retain the action width, change the label to “Đang lưu…”, and set `aria-busy`.
- Error must remain visible next to the action area and must not clear personalization values.

### 4.9 Product content tabs

- Tabs must use `tablist`, `tab`, and `tabpanel` semantics with matching IDs and `aria-controls`/`aria-labelledby`.
- Left and Right Arrow must move selection and focus between tabs.
- Tab must move from the active tab into the active panel.
- Description HTML must be sanitized before rendering.
- Attribute values must wrap rather than truncate information required for purchase decisions.
- An empty attribute or review panel must show a plain-language empty state.

States:

- Default must expose one selected tab.
- Hover must distinguish available tabs.
- Focus-visible must use `focus.ring`.
- Active must update `aria-selected` and roving `tabIndex`.
- Disabled must remain focus-excluded when a future unavailable tab is introduced.
- Loading must keep the tab label and mark its panel busy.
- Error must show a panel-level retry or unavailable message.

### 4.10 Related products

- Related products should prioritize the current category, recipient, occasion, or personalization capability.
- Navigation between related PDPs must update the canonical product route without losing the original listing return URL.
- The section must use a named region and an `h2`.
- Empty related results must omit the section.

States:

- Default, hover, focus-visible, active, disabled, loading, and error behavior must follow the product-card contract.

### 4.11 Cart, checkout, and confirmation

- Cart and checkout overlays must be named dialogs with focus traps, Escape close where safe, and focus restoration.
- Cart lines must display variation and personalization summaries separately.
- Checkout must validate recipient name, phone, and address before submission.
- The server must ignore client-provided selling prices and must revalidate stock and personalization schema versions.
- Empty cart must show a direct action back to the catalog.
- Long personalization summaries must wrap or use disclosure; they must not expand the drawer beyond the viewport.

States:

- Default must show totals and available payment methods.
- Hover, focus-visible, and active must use the shared button contracts.
- Disabled must apply when the cart is empty or submission is already running.
- Loading must set `aria-busy`, preserve entered address data, and prevent duplicate orders.
- Error must remain in the dialog, receive `role="alert"`, and preserve all user input.

### 4.12 AI-assisted authoring

- AI must create reviewable drafts for titles, descriptions, SEO, FAQ, personalization schemas, and variation structure.
- AI must not autonomously publish products or modify verified price, stock, sourcing cost, or supplier facts.
- Generated output must remain explicitly labeled “Bản nháp AI · Chưa lưu” until a user applies and saves it.
- Operators should be able to apply title, description, metadata, or the complete draft independently.
- Provider failure must return an explicit error and must not fabricate live output.
- Empty input must be rejected with a specific instruction about the missing product or template context.

States:

- Default must explain the draft-only boundary.
- Hover, focus-visible, and active must follow shared button behavior.
- Disabled must apply without required context or while generating.
- Loading must retain the prompt and show “AI đang tạo bản nháp…”.
- Error must preserve the prompt and expose a retry action.

## 5. Responsive and edge-case behavior

- At 320–639px, filters must use the modal sheet, product grids must use two columns, PDP content must stack, and purchase actions must remain reachable above mobile navigation.
- At 640–1023px, the UI should use two or three product columns based on available width.
- At 1024px and above, the PDP should use a two-column layout with the purchase configuration column allowed to remain sticky.
- Long translated titles, option labels, personalization values, and attribute values must not overlap adjacent actions.
- Zero products must render a resettable empty state.
- Zero variants or zero sellable variants must disable purchase and show an explicit availability message.
- Missing gallery media must preserve the product title, price, and purchase controls.
- Network failures during pagination must retain previously loaded products.
- Browser Back and direct route loads must restore a meaningful listing or PDP state.

## 6. Accessibility requirements and acceptance criteria

Each check is pass/fail:

- Keyboard: Pass only if every interactive control is reachable and operable with keyboard alone in visual order.
- Focus: Pass only if every focused interactive element has a visible 3px focus indicator that is not clipped or hidden.
- Dialogs: Pass only if focus enters the dialog, remains trapped, Escape closes allowed dialogs, and focus returns to the trigger.
- Contrast: Pass only if normal text is at least 4.5:1, large text is at least 3:1, and focus/component boundaries are at least 3:1 against adjacent colors.
- Targets: Pass only if pointer/touch targets are at least 44 by 44 CSS pixels or meet the WCAG spacing exception.
- Forms: Pass only if each input has a programmatic label and each invalid value has an associated text error.
- Variations: Pass only if groups have accessible names, selected options expose state, and unavailable options expose native disabled state.
- Personalization: Pass only if required progress, upload state, preview errors, and validation errors are available without relying on color.
- Tabs: Pass only if Arrow Left/Right, roving focus, selected state, and panel relationships work.
- Zoom: Pass only if lightbox Escape and focus restoration work and the displayed image matches the selected source or generated preview.
- Reflow: Pass only if no information or operation is lost at 320 CSS pixels or 400% zoom.
- Motion: Pass only if `prefers-reduced-motion: reduce` removes non-essential transforms and transitions.
- Screen reader landmarks: Pass only if the page has one meaningful main region, one primary navigation region, named complementary/filter regions, and named dialogs.
- Status updates: Pass only if result counts, loading, purchase errors, and success messages are announced once through appropriate live regions.

## 7. Content and tone standards

- Labels must describe the result of the action.
- Product copy should lead with recipient or occasion value, then material or production proof.
- Errors must state what failed and the next corrective action.
- AI copy must remain factual and must not invent shipping times, materials, reviews, certifications, or guarantees.

Examples:

- Must use: “Thêm vào giỏ”, “Mua ngay”, “Chọn ảnh từ máy”, “Đặt lại bộ lọc”.
- Must use: “Vui lòng chọn kích thước trước khi thêm vào giỏ.”
- Should use: “Còn 3 sản phẩm cho phân loại này.”
- Must not use: “Bấm đây”, “OK”, “Tiếp tục” without contextual detail.
- Must not use: “Ảnh hoàn hảo 100%” or other unverified guarantees.

## 8. Anti-patterns and prohibited implementations

- Components must not contain raw hex values outside the token declaration or data-driven preview color values.
- Interactive controls must not be nested inside links or buttons.
- Focus outlines must not be removed without an equivalent visible replacement.
- Personalization values must not be encoded into SKU identifiers.
- Attributes must not be presented as selectable variations.
- Unavailable SKU combinations must not be silently substituted after purchase.
- Client-provided price or stock must not be treated as authoritative.
- Full catalogs must not be fetched merely to filter or sort in the browser.
- Data URLs must not be persisted in the cart or submitted as permanent customization media.
- AI output must not auto-save, auto-publish, or overwrite verified commercial data.
- Hover-only actions, hidden focus indicators, one-off spacing, and one-off typography must not ship.

## 9. Migration notes

- Existing storefront components should replace raw Tailwind colors with the semantic CSS variables under `--mc-*` when touched.
- Legacy `?product=` routes should redirect or normalize to `/store/products/:slug` while remaining readable for backward compatibility.
- Legacy data-URL previews must be discarded from persisted carts and replaced by server-hosted customization media.
- Variant parsing should use the shared storefront catalog utilities so admin, API, and storefront resolve options consistently.
- Client-only catalog filtering should remain limited to explicit demo mode.

## 10. QA checklist

- [ ] Listing and direct PDP routes load after a hard refresh.
- [ ] Collection, search, price, occasion, recipient, personalization, and sort state persist in the URL.
- [ ] Server pagination appends unique products and stops at the reported total.
- [ ] Cards expose separate detail and quick-add actions.
- [ ] Every sellable variation resolves to an existing SKU with correct image, price, and stock.
- [ ] Impossible variation combinations are disabled.
- [ ] Personalization required fields block purchase and preserve entered data after errors.
- [ ] Each listing preset creates the intended fields, print areas, and ordered layers without generating synthetic SKUs.
- [ ] Admin can switch scenes, select a SKU preview, drag/resize a print area, bind fields, and assign a scene scope to layers.
- [ ] A scene-level mockup and a variant-level mockup resolve in the expected order; clearing a variant URL falls back to the scene mockup.
- [ ] Uploaded customer imagery respects the selected area shape, fit mode, crop, zoom, translation, rotation, and safe zone.
- [ ] Live preview media is persisted before checkout; demo mode does not call the upload service.
- [ ] Cart separates variation labels from personalization values.
- [ ] Checkout recalculates price and validates stock on the server.
- [ ] Gallery thumbnails expose selected state.
- [ ] Lightbox traps focus, closes with Escape, and restores focus.
- [ ] Tabs support Left/Right Arrow and expose correct ARIA relationships.
- [ ] Sticky mobile CTA appears only after the primary actions scroll away.
- [ ] Empty, loading, disabled, error, and long-content states are visually verified.
- [ ] Text, component, and focus contrast pass automated and manual WCAG 2.2 AA checks.
- [ ] The storefront works at 320px, 768px, 1024px, 1440px, 200% text zoom, and 400% browser zoom.
- [ ] Reduced-motion preference removes non-essential motion.
- [ ] AI drafts never alter price, stock, sourcing cost, or publish state without explicit operator action.
- [ ] Production build, automated tests, diff validation, and browser smoke tests pass before release.
