-- Generic REST/Webhook connectors for websites that are not Shopify/WooCommerce.
-- Secrets are encrypted by the backend before they reach Supabase.

CREATE TABLE IF NOT EXISTS custom_store_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  protocol VARCHAR(20) NOT NULL DEFAULT 'REST_JSON' CHECK (protocol IN ('REST_JSON', 'GRAPHQL', 'WEBHOOK')),
  auth_type VARCHAR(30) NOT NULL DEFAULT 'NONE' CHECK (auth_type IN ('NONE', 'BEARER', 'API_KEY_HEADER', 'BASIC')),
  auth_header_name TEXT,
  auth_secret_ciphertext TEXT,
  publish_path TEXT NOT NULL DEFAULT '/api/products',
  update_path TEXT,
  inventory_path TEXT,
  graphql_mutation TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_tested_at TIMESTAMPTZ,
  last_error TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_store_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES custom_store_connections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  external_product_id TEXT,
  external_url TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('SUBMITTING', 'LIVE', 'SYNC_ERROR')),
  latest_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_custom_store_listing UNIQUE (connection_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_store_connections_active
  ON custom_store_connections(is_active, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_store_listings_sync
  ON custom_store_listings(connection_id, status, updated_at DESC);

ALTER TABLE custom_store_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_store_listings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON custom_store_connections, custom_store_listings FROM anon, authenticated;
