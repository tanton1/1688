# 1688 Listing Sync Hub

Hệ thống sourcing và quản trị catalog gồm Chrome Extension Manifest V3, API Node/Express, Admin React và storefront tích hợp. Supabase PostgreSQL là nguồn dữ liệu production duy nhất.

## Khả năng chính

- Extension trích xuất dữ liệu thật từ trang sản phẩm 1688 và các marketplace được hỗ trợ.
- Pipeline `Source → Normalize → Review → Publish`, có provenance, confidence, cảnh báo và quality gate.
- Quản lý sản phẩm, SKU, giá, tồn kho, glossary, pricing rules, template, diff và đơn hàng.
- Storefront có giỏ hàng, cá nhân hóa, giảm giá, VietQR và tra cứu đơn được xác minh.
- WooCommerce, Shopify và Telegram dùng credential phía máy chủ; secret không đi qua Admin UI.
- Supabase RLS khóa browser roles; mọi data-plane write đi qua backend service role.

## Chạy cục bộ

Yêu cầu Node.js tương thích với Vite 8 và npm workspaces.

```powershell
npm install
npm run dev:admin
npm run dev --workspace=@hub1688/backend
```

Sao chép `.env.example` thành `.env` và điền secret riêng. Không commit `.env`.

## Thiết lập Supabase

1. Tạo project Supabase của riêng bạn.
2. Chạy toàn bộ `supabase/schema.sql` trong SQL Editor. Schema có thể chạy lặp lại để bổ sung các cột migration.
3. Tạo bucket `product-media` nếu dùng media mirroring.
4. Cấu hình `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` và `SUPABASE_STORAGE_BUCKET` trên backend.
5. Gán `app_metadata.role` của user Supabase là `ADMIN` hoặc `SOURCING`.

Trong production, write endpoint trả `503 PERSISTENCE_NOT_CONFIGURED` nếu thiếu service-role persistence.

## Biến môi trường bảo mật

- `ADMIN_API_TOKEN`, `EXTENSION_API_KEY`, `CRON_SECRET`: tạo chuỗi ngẫu nhiên mạnh, khác nhau cho từng môi trường.
- `CORS_ALLOWED_ORIGINS`: danh sách origin được phép, phân cách bằng dấu phẩy.
- `DEMO_MODE=false`: bắt buộc cho production thật.
- `VITE_API_BASE_URL`: API cố định khi Admin không chạy cùng origin; không đặt secret trong biến `VITE_*`.
- Connector: `WOOCOMMERCE_*`, `SHOPIFY_*`, `TELEGRAM_*` chỉ đặt trên máy chủ. Shopify mặc định xuất giá VND qua `SHOPIFY_STORE_CURRENCY=VND`; nếu cửa hàng dùng USD, đặt `SHOPIFY_STORE_CURRENCY=USD` và bắt buộc khai báo tỷ giá hiện hành `SHOPIFY_VND_PER_USD`.
- AI: `APIKEY_FUN_*` và `AI_ALLOWED_BASE_URLS` chỉ đặt trên máy chủ; runtime UI không sửa được gateway/key. Khi thiếu key hoặc provider lỗi, production trả lỗi rõ ràng thay vì sinh nội dung mẫu.

## Build và kiểm thử

```powershell
npm test
npm run build:vercel
npm run build:extension
npm audit
npm ls --depth=0
```

Load extension đã build từ `apps/extension/dist` trong `chrome://extensions` bằng chế độ Developer mode.

## Deploy

Vercel dùng `vercel.json` và entrypoint `api/index.js`. Thêm các biến trong `.env.example` vào dashboard của môi trường deploy, chạy schema trước, sau đó kiểm tra `/health`.

Catalog demo và social-proof mô phỏng chỉ xuất hiện khi build Admin với `VITE_DEMO_MODE=true`; UI luôn gắn nhãn Demo. Production rỗng hoặc lỗi sẽ hiển thị đúng empty/error state, không tự nạp dữ liệu giả.
