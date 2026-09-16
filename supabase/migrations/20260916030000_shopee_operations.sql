-- Operational controls for multiple Shopee apps, Seller health and scheduled stock sync.

ALTER TABLE channel_accounts
  ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS disconnected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_inventory_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_error_count INTEGER NOT NULL DEFAULT 0;

-- A Seller is unique inside one Open Platform app. This allows the same Shop ID
-- to be re-authorized through a different approved app without overwriting it.
ALTER TABLE channel_accounts DROP CONSTRAINT IF EXISTS uq_channel_account_shop;
ALTER TABLE channel_accounts DROP CONSTRAINT IF EXISTS uq_channel_account_app_shop;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_channel_account_app_shop'
  ) THEN
    ALTER TABLE channel_accounts
      ADD CONSTRAINT uq_channel_account_app_shop
      UNIQUE (platform, channel_app_config_id, shop_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_channel_accounts_sync_due
  ON channel_accounts(platform, auto_sync_enabled, status, last_inventory_sync_at);

CREATE INDEX IF NOT EXISTS idx_channel_listings_sync_due
  ON channel_listings(platform, status, last_synced_at);

