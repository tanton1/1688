-- Omnichannel foundation for Shopee and TikTok Shop.
-- Credentials are encrypted by the backend before they reach these tables.

CREATE TABLE IF NOT EXISTS channel_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform VARCHAR(30) NOT NULL CHECK (platform IN ('SHOPEE', 'TIKTOK_SHOP')),
  shop_id TEXT NOT NULL,
  shop_name TEXT,
  region VARCHAR(12) NOT NULL DEFAULT 'VN',
  shop_cipher TEXT,
  access_token_ciphertext TEXT NOT NULL,
  refresh_token_ciphertext TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  granted_scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status VARCHAR(30) NOT NULL DEFAULT 'CONNECTED',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  last_health_check_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_channel_account_shop UNIQUE (platform, shop_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_accounts_platform_status
  ON channel_accounts(platform, status);

CREATE TABLE IF NOT EXISTS channel_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  channel_account_id UUID NOT NULL REFERENCES channel_accounts(id) ON DELETE CASCADE,
  platform VARCHAR(30) NOT NULL CHECK (platform IN ('SHOPEE', 'TIKTOK_SHOP')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_id TEXT NOT NULL,
  category_path TEXT,
  category_version TEXT,
  brand_id TEXT,
  attributes JSONB NOT NULL DEFAULT '[]'::jsonb,
  logistics JSONB NOT NULL DEFAULT '[]'::jsonb,
  package_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  pricing_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  audit_status TEXT,
  external_product_id TEXT,
  external_url TEXT,
  idempotency_key UUID NOT NULL DEFAULT uuid_generate_v4(),
  latest_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  rejection_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_error TEXT,
  submit_attempts INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_channel_listing_product UNIQUE (channel_account_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_listings_status
  ON channel_listings(platform, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS channel_skus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_listing_id UUID NOT NULL REFERENCES channel_listings(id) ON DELETE CASCADE,
  product_variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  source_sku_id TEXT NOT NULL,
  seller_sku TEXT NOT NULL,
  external_sku_id TEXT,
  channel_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
  channel_stock INTEGER NOT NULL DEFAULT 0,
  warehouse_id TEXT,
  remote_image_id TEXT,
  remote_image_url TEXT,
  sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_channel_listing_sku UNIQUE (channel_listing_id, source_sku_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_skus_external
  ON channel_skus(channel_listing_id, external_sku_id);

CREATE TABLE IF NOT EXISTS channel_category_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform VARCHAR(30) NOT NULL CHECK (platform IN ('SHOPEE', 'TIKTOK_SHOP')),
  channel_account_id UUID NOT NULL REFERENCES channel_accounts(id) ON DELETE CASCADE,
  local_category TEXT NOT NULL,
  external_category_id TEXT NOT NULL,
  external_category_path TEXT,
  category_version TEXT,
  attribute_defaults JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_channel_category_mapping UNIQUE (channel_account_id, local_category)
);

CREATE TABLE IF NOT EXISTS channel_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_listing_id UUID NOT NULL REFERENCES channel_listings(id) ON DELETE CASCADE,
  job_type VARCHAR(40) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  idempotency_key UUID NOT NULL DEFAULT uuid_generate_v4(),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error TEXT,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channel_jobs_queue
  ON channel_jobs(status, available_at, created_at);

CREATE TABLE IF NOT EXISTS channel_sync_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_listing_id UUID REFERENCES channel_listings(id) ON DELETE CASCADE,
  channel_account_id UUID REFERENCES channel_accounts(id) ON DELETE CASCADE,
  platform VARCHAR(30) NOT NULL CHECK (platform IN ('SHOPEE', 'TIKTOK_SHOP')),
  event_type VARCHAR(60) NOT NULL,
  level VARCHAR(20) NOT NULL DEFAULT 'INFO',
  request_id TEXT,
  message TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channel_sync_events_listing
  ON channel_sync_events(channel_listing_id, created_at DESC);

ALTER TABLE channel_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_category_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_sync_events ENABLE ROW LEVEL SECURITY;

-- These tables intentionally have no anon/authenticated policies. The backend
-- accesses them with the service-role key after applying its own ADMIN checks.
