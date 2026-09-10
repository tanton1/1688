-- ==============================================================================
-- 1688 LISTING SYNC HUB - SUPABASE POSTGRESQL SCHEMA
-- Dự án: https://jpbrwfctgrufbdkstufq.supabase.co
-- ==============================================================================

-- Bật các tiện ích mở rộng nếu cần
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BẢNG NHÀ CUNG CẤP / GIAN HÀNG 1688 (SUPPLIERS)
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_platform VARCHAR(50) NOT NULL DEFAULT '1688',
    shop_id VARCHAR(100) NOT NULL,
    shop_name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    shop_url TEXT NOT NULL,
    rating_score NUMERIC(3, 2) DEFAULT 0.0,
    reliability_tier VARCHAR(50) DEFAULT 'STANDARD', -- VERIFIED, SUPER_FACTORY, STANDARD
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_supplier_platform_shop UNIQUE (source_platform, shop_id)
);

-- 2. BẢNG SẢN PHẨM NGUỒN 1688 (SOURCE PRODUCTS)
CREATE TABLE IF NOT EXISTS source_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_platform VARCHAR(50) NOT NULL DEFAULT '1688',
    source_product_id VARCHAR(100) NOT NULL, -- 1688 Offer ID (e.g. 83647282933)
    source_url TEXT NOT NULL,
    title_cn TEXT NOT NULL,
    category_path TEXT,
    moq INTEGER NOT NULL DEFAULT 1,
    min_price_cny NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    max_price_cny NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    raw_media_json JSONB NOT NULL DEFAULT '{"images": []}'::jsonb,
    raw_attributes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    raw_description_html TEXT,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    last_checked_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_source_platform_product UNIQUE (source_platform, source_product_id)
);
CREATE INDEX IF NOT EXISTS idx_source_product_id ON source_products(source_product_id);

-- 3. BẢNG VARIANT NGUỒN 1688 (SOURCE VARIANTS / SKUS)
CREATE TABLE IF NOT EXISTS source_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_product_id UUID NOT NULL REFERENCES source_products(id) ON DELETE CASCADE,
    source_sku_id VARCHAR(100) NOT NULL, -- 1688 SkuID gốc (e.g. "1688_4388992")
    attributes_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_price_cny NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    source_stock INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_source_product_sku UNIQUE (source_product_id, source_sku_id)
);
CREATE INDEX IF NOT EXISTS idx_source_sku_id ON source_variants(source_sku_id);

-- 4. BẢNG SẢN PHẨM WEB BÁN HÀNG (WEB PRODUCTS)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    sku_code VARCHAR(100) UNIQUE NOT NULL,
    
    -- Tiếng Việt
    title_vi TEXT NOT NULL,
    ai_seo_title TEXT,
    short_desc_vi TEXT,
    full_desc_vi TEXT,

    -- Tiếng Anh & Ngôn ngữ hiển thị
    title_en TEXT,
    short_desc_en TEXT,
    full_desc_en TEXT,
    display_language VARCHAR(10) DEFAULT 'VI',

    category_name VARCHAR(100) NOT NULL,
    primary_image TEXT NOT NULL,
    gallery_images TEXT[] DEFAULT ARRAY[]::TEXT[],
    detail_images TEXT[] DEFAULT ARRAY[]::TEXT[],
    video_url TEXT,
    video_poster_url TEXT,

    -- Thuộc tính & Thang giá sỉ JSONB
    attributes_json JSONB DEFAULT '[]'::jsonb,
    price_tiers_json JSONB DEFAULT '[]'::jsonb,

    -- SEO & Dữ liệu có cấu trúc Google
    seo_metadata JSONB DEFAULT '{}'::jsonb,
    meta_title TEXT,
    meta_description TEXT,
    focus_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
    images_seo JSONB DEFAULT '[]'::jsonb,
    faqs_json JSONB DEFAULT '[]'::jsonb,

    -- Kênh bán lẻ
    store_sync_history JSONB DEFAULT '[]'::jsonb,

    status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, READY_TO_REVIEW, PUBLISHED, ARCHIVED
    quality_score INTEGER DEFAULT 0,

    min_price_vnd NUMERIC(12, 0) NOT NULL DEFAULT 0,
    max_price_vnd NUMERIC(12, 0) NOT NULL DEFAULT 0,

    -- Khóa trường dữ liệu (Field Locks)
    is_title_locked BOOLEAN DEFAULT FALSE,
    is_desc_locked BOOLEAN DEFAULT FALSE,
    is_images_locked BOOLEAN DEFAULT FALSE,
    is_price_auto_sync BOOLEAN DEFAULT TRUE,
    is_stock_auto_sync BOOLEAN DEFAULT TRUE,

    source_product_id VARCHAR(100) NOT NULL,
    source_url TEXT NOT NULL,
    supplier_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_source_id ON products(source_product_id);
CREATE INDEX IF NOT EXISTS idx_product_status ON products(status);

-- MIGRATION: Bổ sung các cột mới nếu bảng đã tồn tại
ALTER TABLE products ADD COLUMN IF NOT EXISTS title_en TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS short_desc_en TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS full_desc_en TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS display_language VARCHAR(10) DEFAULT 'VI';
ALTER TABLE products ADD COLUMN IF NOT EXISTS detail_images TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_poster_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS attributes_json JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_tiers_json JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS focus_keywords TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS images_seo JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS faqs_json JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_sync_history JSONB DEFAULT '[]'::jsonb;

-- 5. BẢNG LIÊN KẾT SẢN PHẨM VỚI NHIỀU NGUỒN (PRODUCT SOURCE LINKS)
CREATE TABLE IF NOT EXISTS product_source_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    source_product_id UUID NOT NULL REFERENCES source_products(id) ON DELETE CASCADE,
    is_primary_source BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_product_source UNIQUE (product_id, source_product_id)
);

-- 6. BẢNG BIẾN THỂ SẢN PHẨM WEB (WEB PRODUCT VARIANTS)
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    source_variant_id UUID REFERENCES source_variants(id) ON DELETE SET NULL,
    source_sku_id VARCHAR(100) NOT NULL,
    color_name VARCHAR(100),
    color_name_en VARCHAR(100),
    size_name VARCHAR(100),
    size_name_en VARCHAR(100),
    cost_price_vnd NUMERIC(12, 0) NOT NULL,
    selling_price_vnd NUMERIC(12, 0) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    source_available BOOLEAN DEFAULT TRUE,
    selected_for_sale BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_variants_prod_id ON product_variants(product_id);

-- MIGRATION: Bổ sung cột tiếng Anh cho biến thể nếu đã tồn tại
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS color_name_en VARCHAR(100);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS size_name_en VARCHAR(100);

-- 7. BẢNG QUY TẮC ĐỊNH GIÁ BÁN LẺ (PRICING RULES)
CREATE TABLE IF NOT EXISTS pricing_rules (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_keyword VARCHAR(100),
    exchange_rate NUMERIC(10, 2) NOT NULL DEFAULT 3800.00,
    domestic_china_ship_vnd NUMERIC(12, 0) NOT NULL DEFAULT 12000,
    intl_ship_per_kg_vnd NUMERIC(12, 0) NOT NULL DEFAULT 30000,
    estimated_weight_kg NUMERIC(6, 3) NOT NULL DEFAULT 0.35,
    multiplier NUMERIC(4, 2) NOT NULL DEFAULT 2.2,
    platform_fee_rate NUMERIC(4, 3) NOT NULL DEFAULT 0.05,
    min_profit_vnd NUMERIC(12, 0) NOT NULL DEFAULT 50000,
    min_margin_percent NUMERIC(5, 2) NOT NULL DEFAULT 35.0,
    round_to_thousand BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. BẢNG TỪ ĐIỂN DỊCH THUẬT NGỮ E-COMMERCE (TRANSLATION GLOSSARIES)
CREATE TABLE IF NOT EXISTS translation_glossaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_text VARCHAR(255) UNIQUE NOT NULL,
    target_text VARCHAR(255) NOT NULL,
    category VARCHAR(50) DEFAULT 'GENERAL',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. BẢNG NHẬT KÝ LỆCH GIÁ VÀ TỒN KHO (SYNC LOGS & DIFFS)
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- PRICE_CHANGED, STOCK_OUT, SKU_REMOVED, AUTO_UPDATED, REVIEW_REQUIRED
    old_value_json JSONB,
    new_value_json JSONB,
    diff_summary TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING_REVIEW', -- APPLIED, PENDING_REVIEW, IGNORED
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sync_logs ON sync_logs(product_id, created_at);

-- ==============================================================================
-- DỮ LIỆU KHỞI TẠO MẪU (INITIAL SEED DATA)
-- ==============================================================================

INSERT INTO pricing_rules (id, name, category_keyword, exchange_rate, domestic_china_ship_vnd, intl_ship_per_kg_vnd, estimated_weight_kg, multiplier, platform_fee_rate, min_profit_vnd, min_margin_percent, round_to_thousand)
VALUES 
('DEFAULT_FASHION', 'Mặc định Thời trang & Gia dụng', NULL, 3800, 12000, 30000, 0.35, 2.2, 0.05, 50000, 35.0, TRUE),
('CLOTHING_SHIRTS', 'Áo thời trang', 'Áo', 3800, 12000, 30000, 0.25, 2.2, 0.05, 50000, 35.0, TRUE),
('CLOTHING_PANTS', 'Quần & Legging', 'Quần', 3800, 12000, 30000, 0.35, 2.3, 0.05, 60000, 35.0, TRUE),
('ACCESSORIES', 'Phụ kiện thời trang', 'Phụ kiện', 3800, 8000, 30000, 0.15, 2.5, 0.05, 40000, 40.0, TRUE)
ON CONFLICT (id) DO NOTHING;
