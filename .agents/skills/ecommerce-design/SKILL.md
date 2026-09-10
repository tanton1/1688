---
name: ecommerce-design
description: >
  Specialized e-commerce storefront and high-conversion product design system.
  Crafts Macorner / Shopify Plus style product detail pages (PDP), interactive variant selectors,
  slide-out cart drawers with free shipping progress bars, high-converting checkout flows,
  and synchronized 1688 catalog showcases.
triggers:
  - "ecommerce design"
  - "storefront design"
  - "design product page"
  - "design pdp"
  - "thiet ke web ban hang"
  - "thiet ke san pham"
  - "macorner style"
  - "cart drawer design"
  - "variant selector"
  - "checkout design"
---

# E-Commerce & Storefront Design System

High-converting, mobile-first design system tailored for modern e-commerce storefronts, dropshipping from 1688, and customized gift/product brands (Macorner style).

---

## 1. Product Card Architecture (Grid & Catalog)

Every product card in the collection grid must feature:
- **Aspect Ratio**: Consistent `aspect-[3/4]` or `aspect-square`, `object-cover`, with subtle image zoom on hover (`group-hover:scale-105 transition-transform duration-300`).
- **Badges**:
  - Discount Tag: `bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full absolute top-2.5 left-2.5 shadow-sm`.
  - Feature Tag: `bg-amber-400 text-black text-xs font-semibold px-2 py-0.5 rounded-full` (e.g. "Bán chạy", "Mới về").
- **Secondary Image Preview**: Seamless swap to the second lifestyle/detail image on hover.
- **Title**: Maximum 2 lines with ellipsis (`line-clamp-2 text-sm font-medium text-gray-900 group-hover:text-primary`).
- **Price Block**:
  - Sale Price: `text-base font-bold text-red-600`.
  - Original Price: `text-xs text-gray-400 line-through ml-1.5`.
- **Review Rating**: 5 golden stars + review count in parentheses `(4.9 ★ · 128 đánh giá)`.
- **Quick Add**: Floating button on card bottom or drawer trigger.

---

## 2. Product Detail Page (PDP) Experience

The PDP is the primary conversion engine:

### A. Media Gallery
- Left column on desktop (`lg:w-1/2`), sticky scroll.
- Main high-resolution image with lightbox zoom.
- Thumbnail strip (horizontal below or vertical left) with clear active border (`ring-2 ring-primary ring-offset-2`).

### B. Product Information & Purchase Box
- Right column on desktop (`lg:w-1/2`).
- **Breadcrumbs**: Trang chủ / Danh mục / Tên sản phẩm.
- **Title & Rating**: Bold title (`text-2xl lg:text-3xl font-bold tracking-tight`), star rating with direct jump link to reviews.
- **Price Display**: Prominent discount banner, saving amount (e.g. "Tiết kiệm 35%").
- **Flash Sale / Urgency Banner**: Subtle countdown timer or remaining stock bar ("Chỉ còn 7 sản phẩm trong kho!").
- **Variant Selectors**:
  - Color Swatches: Circular buttons with active checkmark or double ring.
  - Size / Model Options: Pill buttons with unavailable items crossed out.
- **Personalization (Macorner Style)**:
  - Text input for custom engraving / names with live character count.
  - Photo upload zone with instant preview.
- **Quantity Stepper & Action Buttons**:
  - Stepper `[-] [ 1 ] [+]` with numeric validation.
  - Primary CTA: Large "Thêm Vào Giỏ Hàng" (`w-full py-4 text-base font-bold bg-primary text-white rounded-full shadow-lg hover:shadow-xl active:scale-[0.99]`).
  - Secondary CTA: "Mua Ngay Bằng 1 Click".
- **Sticky Mobile Bottom Bar**:
  - When the user scrolls past the main buy button on mobile, show a fixed bottom bar containing thumbnail, price, and "Thêm Giỏ Hàng" button.

### C. Trust Signals & Value Propositions
- 3 to 4 trust icons directly beneath the CTA:
  - 🚚 *Giao hàng toàn quốc & Kiểm tra hàng trước khi nhận*
  - 🔄 *Đổi trả dễ dàng trong vòng 7 ngày*
  - 🛡️ *Hàng chính hãng bảo hành chất lượng*
  - 💬 *Hỗ trợ tư vấn 24/7*

---

## 3. Slide-Out Cart Drawer

Never redirect the user directly to a full-page cart if they want to keep shopping. Use a slide-out drawer (`fixed inset-y-0 right-0 max-w-md w-full z-50`):
- **Free Shipping Progress Bar**:
  - "Mua thêm 150.000₫ để được **MIỄN PHÍ VẬN CHUYỂN**!" with an animated progress bar.
- **Cart Item Rows**: Thumbnail, title, selected variant chips, price, inline quantity stepper, and remove trash icon.
- **Cross-Sell / Upsell Carousel**: "Thường được mua cùng" with 1-click add button.
- **Footer Checkout CTA**: Subtotal, discount code input, and high-visibility "Tiến Hành Thanh Toán" button.
