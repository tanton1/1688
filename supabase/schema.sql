-- ==============================================================================
-- 1688 LISTING SYNC HUB - SUPABASE POSTGRESQL SCHEMA
-- Chạy trong Supabase SQL Editor của project đích.
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
    rating_score NUMERIC(3, 2),
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

    -- Cá nhân hóa/POD cho storefront
    is_personalized BOOLEAN NOT NULL DEFAULT FALSE,
    personalization_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    customizer_template_url TEXT,
    volume_discount_tiers JSONB NOT NULL DEFAULT '[]'::jsonb,
    gift_addons JSONB NOT NULL DEFAULT '[]'::jsonb,
    occasion_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    recipient_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    rating NUMERIC(3,2),
    review_count INTEGER NOT NULL DEFAULT 0,

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
ALTER TABLE products ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_policy TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_policy TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS source_platform VARCHAR(50) NOT NULL DEFAULT '1688';
ALTER TABLE products ADD COLUMN IF NOT EXISTS source_currency VARCHAR(3) NOT NULL DEFAULT 'CNY';
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_media_mirrored BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS mirrored_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_personalized BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS personalization_fields JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS customizer_template_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS volume_discount_tiers JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS gift_addons JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS occasion_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS recipient_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0;

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
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS source_price NUMERIC(14, 2);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS source_available BOOLEAN DEFAULT TRUE;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS selected_for_sale BOOLEAN DEFAULT TRUE;

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

-- Persistent operational records. The backend service role is the only data-plane client.
CREATE TABLE IF NOT EXISTS product_templates (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_name VARCHAR(120) NOT NULL,
    target_platform VARCHAR(30) NOT NULL DEFAULT 'ALL',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    variation_json JSONB NOT NULL DEFAULT '{"options":[]}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    platform VARCHAR(30) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    customer_address TEXT,
    items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount_vnd NUMERIC(14,0) NOT NULL DEFAULT 0,
    total_cost_vnd NUMERIC(14,0) NOT NULL DEFAULT 0,
    estimated_profit_vnd NUMERIC(14,0) NOT NULL DEFAULT 0,
    status VARCHAR(40) NOT NULL DEFAULT 'PENDING_SOURCING',
    payment_method VARCHAR(30),
    payment_status VARCHAR(30),
    note TEXT,
    gift_addons_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    discount_code VARCHAR(40),
    discount_amount_vnd NUMERIC(14,0) NOT NULL DEFAULT 0,
    shipping_fee_vnd NUMERIC(14,0) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS gift_addons_json JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS discount_code VARCHAR(40);
ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS discount_amount_vnd NUMERIC(14,0) NOT NULL DEFAULT 0;
ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS shipping_fee_vnd NUMERIC(14,0) NOT NULL DEFAULT 0;
ALTER TABLE suppliers ALTER COLUMN rating_score DROP DEFAULT;

-- Checkout atomic: khóa tồn kho, kiểm tra lại giá và tạo đơn trong cùng transaction.
CREATE OR REPLACE FUNCTION create_storefront_order_atomic(p_order JSONB, p_reservations JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    reservation JSONB;
    remaining_stock INTEGER;
    created_id UUID := (p_order->>'id')::UUID;
BEGIN
    FOR reservation IN SELECT value FROM jsonb_array_elements(p_reservations)
    LOOP
        UPDATE product_variants AS variant
        SET stock_quantity = variant.stock_quantity - (reservation->>'quantity')::INTEGER,
            source_available = (variant.stock_quantity - (reservation->>'quantity')::INTEGER) > 0,
            updated_at = NOW()
        WHERE variant.product_id = (reservation->>'productId')::UUID
          AND variant.source_sku_id = reservation->>'sourceSkuId'
          AND variant.selected_for_sale = TRUE
          AND variant.source_available = TRUE
          AND variant.stock_quantity >= (reservation->>'quantity')::INTEGER
          AND variant.selling_price_vnd = (reservation->>'expectedBasePriceVND')::NUMERIC
          AND EXISTS (SELECT 1 FROM products p WHERE p.id = variant.product_id AND p.status = 'PUBLISHED')
        RETURNING variant.stock_quantity INTO remaining_stock;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'STOCK_OR_PRICE_CHANGED';
        END IF;
    END LOOP;

    INSERT INTO customer_orders (
        id, order_number, platform, customer_name, customer_phone, customer_address,
        items_json, total_amount_vnd, total_cost_vnd, estimated_profit_vnd, status,
        payment_method, payment_status, note, gift_addons_json, discount_code,
        discount_amount_vnd, shipping_fee_vnd, created_at, updated_at
    ) VALUES (
        created_id, p_order->>'orderNumber', p_order->>'platform', p_order->>'customerName',
        p_order->>'customerPhone', p_order->>'customerAddress', COALESCE(p_order->'items', '[]'::JSONB),
        (p_order->>'totalAmountVND')::NUMERIC, (p_order->>'totalCostVND')::NUMERIC,
        (p_order->>'estimatedProfitVND')::NUMERIC, p_order->>'status', p_order->>'paymentMethod',
        p_order->>'paymentStatus', NULLIF(p_order->>'note', ''),
        COALESCE(p_order->'giftAddonsSelected', '[]'::JSONB), NULLIF(p_order->>'discountCode', ''),
        COALESCE((p_order->>'discountAmountVND')::NUMERIC, 0),
        COALESCE((p_order->>'shippingFeeVND')::NUMERIC, 0),
        (p_order->>'createdAt')::TIMESTAMPTZ, (p_order->>'updatedAt')::TIMESTAMPTZ
    );
    RETURN created_id;
END;
$$;

REVOKE ALL ON FUNCTION create_storefront_order_atomic(JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_storefront_order_atomic(JSONB, JSONB) TO service_role;

CREATE TABLE IF NOT EXISTS import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status VARCHAR(30) NOT NULL,
    total_items INTEGER NOT NULL DEFAULT 0,
    completed_items INTEGER NOT NULL DEFAULT 0,
    failed_items INTEGER NOT NULL DEFAULT 0,
    results_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS storefront_settings (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS is enabled on every application table. No browser policy is created: all
-- writes go through authenticated API endpoints using the server-only service role.
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_source_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_glossaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE storefront_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Public product/customization media. Uploads are performed only by the backend
-- service role; storefront visitors only need read access to render previews.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-media',
    'product-media',
    TRUE,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND policyname = 'Public read product media'
    ) THEN
        CREATE POLICY "Public read product media"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'product-media');
    END IF;
END $$;
