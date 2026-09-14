-- Reusable customizer artwork captured from source product pages.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS customizer_assets JSONB NOT NULL DEFAULT '[]'::JSONB;

CREATE INDEX IF NOT EXISTS idx_products_customizer_assets_gin
  ON products USING GIN (customizer_assets);
