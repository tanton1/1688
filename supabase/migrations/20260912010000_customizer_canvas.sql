-- Store configurable POD print areas separately from SEO metadata.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS customizer_canvas JSONB NOT NULL DEFAULT '{"printAreas":[]}'::JSONB;
