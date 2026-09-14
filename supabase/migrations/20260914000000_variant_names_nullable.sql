-- A marketplace listing may expose a single unnamed axis (for example an
-- Etsy listing with only "Default").  Those variants legitimately have no
-- size or colour, so legacy NOT NULL constraints must not reject the import.
ALTER TABLE public.product_variants
  ALTER COLUMN color_name DROP NOT NULL;

ALTER TABLE public.product_variants
  ALTER COLUMN size_name DROP NOT NULL;
