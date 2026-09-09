# 1688 Listing Sync Hub

Hệ thống **1688 Listing Sync Hub** là giải pháp sourcing và đồng bộ sản phẩm đa tầng từ **1688.com** về website bán hàng.

Hệ thống bao gồm:
1. **Chrome Extension (Manifest V3)**:
   - Tự động nhận diện trang chi tiết (`detail.1688.com`), kết quả tìm kiếm (`s.1688.com`), và gian hàng (`*.1688.com`).
   - Giao diện **Side Panel (React + Tailwind CSS)**: Hỗ trợ **Quick Import (1-Click)** và **Advanced Import**.
   - **Source Overlay**: Hiển thị nút nổi `+ ĐƯA SẢN PHẨM VỀ WEB` hoặc huy hiệu xanh `✓ ĐÃ CÓ TRÊN WEB` (kèm giá bán, tồn kho, biên lãi %) trực tiếp trên trang 1688.
   - **Cấu hình Backend Linh Hoạt**: Hỗ trợ chuyển đổi giữa `Localhost:3001` và `Vercel Cloud URL` ngay trong giao diện Side Panel.
2. **Backend Sync Hub (Vercel Serverless + Supabase)**:
   - Cơ sở dữ liệu đám mây PostgreSQL tại **Supabase Project: `https://jpbrwfctgrufbdkstufq.supabase.co`**.
   - **Translation Engine 2 tầng**: Lọc bỏ rác spam 1688, ưu tiên từ điển riêng (Glossary), sinh 4 style tiêu đề E-commerce và cấu trúc lại mô tả 7 phần.
   - **SKU Mapping Engine**: Nhân tổ hợp ma trận Cartesian (Color x Size), map chính xác với `sourceSkuId` gốc của 1688.
   - **Pricing Engine**: Công thức tính giá vốn CNY -> VND, tính phí vận chuyển nội địa/quốc tế, hệ số Multiplier theo ngành hàng, làm tròn giá tâm lý `.000` và cảnh báo biên lợi nhuận thấp.
   - **Smart Diff Engine**: Nhận diện biến động giá và tồn kho với ngưỡng cảnh báo (<3% hấp thụ, 3-7% review, >7% alert), cơ chế khóa trường dữ liệu (**Field Lock**).
   - **Readiness Quality Scorer**: Chấm điểm listing (0 - 100) trước khi cho phép Publish.
   - Đóng gói Serverless Function sẵn sàng deploy lên **Vercel** (`api/index.js` & `vercel.json`).

---

## ⚡ Hướng Dẫn Thiết Lập Supabase & Deploy Lên Vercel

### BƯỚC 1: Khởi Tạo Cơ Sở Dữ Liệu Trên Supabase
1. Truy cập vào dự án Supabase của bạn:
   👉 **[https://supabase.com/dashboard/project/jpbrwfctgrufbdkstufq](https://supabase.com/dashboard/project/jpbrwfctgrufbdkstufq)**
2. Vào mục **SQL Editor** ở thanh menu bên trái.
3. Bấm **New Query**, mở file [supabase/schema.sql](file:///d:/APP%20D%E1%BB%B1%20%C3%81n/1688/supabase/schema.sql) trong dự án, copy toàn bộ nội dung và dán vào.
4. Bấm **RUN** để tạo 10 bảng dữ liệu, các quan hệ khóa ngoại, index và dữ liệu khởi tạo mẫu.
5. (Tùy chọn) Vào mục **Storage** > Bấm **New Bucket** > Tạo bucket tên `product-media` (Public bucket) để lưu trữ vĩnh viễn hình ảnh sản phẩm 1688.
6. Vào mục **Project Settings > API**:
   - Copy mã **Project URL**: `https://jpbrwfctgrufbdkstufq.supabase.co`
   - Copy mã **anon / public key**
   - Copy mã **service_role key** (Dùng để backend ghi dữ liệu bypass RLS)

---

### BƯỚC 2: Deploy Backend Lên Vercel

#### Cách 1: Deploy qua GitHub / GitLab (Khuyên Dùng)
1. Đẩy mã nguồn dự án lên GitHub:
   ```powershell
   git init
   git add .
   git commit -m "feat: 1688 listing sync hub with supabase and vercel"
   git branch -M main
   git remote add origin <URL_GITHUB_CUA_BAN>
   git push -u origin main
   ```
2. Truy cập [https://vercel.com](https://vercel.com) > Bấm **Add New Project** > Chọn kho GitHub vừa tạo.
3. Trong phần **Environment Variables**, thêm các biến sau (tham khảo file [.env.example](file:///d:/APP%20D%E1%BB%B1%20%C3%81n/1688/.env.example)):
   - `SUPABASE_URL`: `https://jpbrwfctgrufbdkstufq.supabase.co`
   - `SUPABASE_ANON_KEY`: `<anon_key_lay_tu_supabase>`
   - `SUPABASE_SERVICE_ROLE_KEY`: `<service_role_key_lay_tu_supabase>`
   - `SUPABASE_STORAGE_BUCKET`: `product-media`
   - `EXTENSION_API_KEY`: `hub1688_secret_extension_key_2026`
4. Bấm **Deploy**. Sau khoảng 1 phút, Vercel sẽ cung cấp một đường dẫn (ví dụ: `https://hub1688-sync.vercel.app`).
5. Kiểm tra trạng thái: Truy cập `https://hub1688-sync.vercel.app/health` thấy trả về `status: "ok"` là hoàn tất 100%!

#### Cách 2: Deploy trực tiếp bằng Vercel CLI
```powershell
# Đăng nhập và deploy trực tiếp từ terminal
npx vercel
# Sau đó thiết lập biến môi trường và deploy production:
npx vercel --prod
```

---

### BƯỚC 3: Kết Nối Chrome Extension Với Vercel Cloud
1. Mở Chrome, vào `chrome://extensions/` > Bật **Developer mode** > Bấm **Load unpacked** > Chọn thư mục:
   ```
   D:\APP Dự Án\1688\apps\extension\dist
   ```
2. Truy cập trang sản phẩm 1688 bất kỳ (ví dụ: `https://detail.1688.com/offer/...`).
3. Bấm vào nút nổi **`+ ĐƯA SẢN PHẨM VỀ WEB`** để mở Side Panel bên phải.
4. Trên thanh Header của Side Panel, bấm vào biểu tượng **bánh răng ⚙️ (Cấu hình)**:
   - Dán URL Vercel của bạn vào ô input (ví dụ: `https://hub1688-sync.vercel.app`).
   - Bấm **Lưu URL**.
5. Bây giờ, mỗi khi bạn bấm **`ĐỒNG BỘ VỀ WEB (1-CLICK)`**, dữ liệu sản phẩm 1688 sẽ được đẩy thẳng lên Vercel Serverless và lưu trữ bền vững vào cơ sở dữ liệu Supabase đám mây mà không cần mở bất kỳ terminal nào trên máy tính!

---

## 🧪 Kiểm Thử & Chạy Cục Bộ (Local Development)

```powershell
# 1. Chạy Unit Test kiểm tra các Engine lõi
npm test

# 2. Build nhanh cho Vercel
npm run build:vercel

# 3. Build Extension
npm run build --workspace=@hub1688/extension
```
