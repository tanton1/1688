-- Store Shopee Open Platform application credentials separately from Seller shops.
-- partner_key_ciphertext is encrypted by the backend with AES-256-GCM before insert.

CREATE TABLE IF NOT EXISTS channel_app_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform VARCHAR(30) NOT NULL CHECK (platform IN ('SHOPEE', 'TIKTOK_SHOP')),
  name TEXT NOT NULL DEFAULT 'Shopee Open Platform',
  region VARCHAR(12) NOT NULL DEFAULT 'VN',
  partner_id TEXT NOT NULL,
  partner_key_ciphertext TEXT NOT NULL,
  redirect_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_channel_app_partner UNIQUE (platform, partner_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_app_configs_platform_active
  ON channel_app_configs(platform, is_active, updated_at DESC);

ALTER TABLE channel_accounts
  ADD COLUMN IF NOT EXISTS channel_app_config_id UUID REFERENCES channel_app_configs(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_channel_accounts_app_config
  ON channel_accounts(channel_app_config_id, status, updated_at DESC);

ALTER TABLE channel_app_configs ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies by design. Only the backend service-role may
-- read encrypted application credentials and Seller tokens.
