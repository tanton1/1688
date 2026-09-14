-- Backfill reusable customizer assets for products imported before the
-- customizer_assets manifest was introduced. This is idempotent and leaves
-- existing manifests untouched.
WITH option_assets AS (
  SELECT
    p.id,
    jsonb_agg(
      jsonb_build_object(
        'id', 'asset_' || md5(u.url),
        'url', u.url,
        'originalUrl', u.url,
        'label', COALESCE(NULLIF(o.option->>'label', ''), 'Custom asset'),
        'category', COALESCE(NULLIF(f.field->>'label', ''), 'Customizer'),
        'sourceProductId', p.source_product_id,
        'sourceGroupId', f.field->>'id',
        'assetType', 'OPTION',
        'createdAt', now()::text
      )
      ORDER BY f.ord, o.ord
    ) AS assets
  FROM products p
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(p.personalization_fields) = 'array'
        THEN p.personalization_fields
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS f(field, ord)
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(f.field->'options') = 'array'
        THEN f.field->'options'
      ELSE '[]'::jsonb
    END
  ) WITH ORDINALITY AS o(option, ord)
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      NULLIF(o.option->>'previewAssetUrl', ''),
      NULLIF(o.option->>'thumbnail', '')
    ) AS url
  ) u
  WHERE u.url ~* '^https?://'
  GROUP BY p.id
),
assets_to_write AS (
  SELECT
    p.id,
    option_assets.assets || CASE
      WHEN p.customizer_template_url ~* '^https?://' THEN jsonb_build_array(
        jsonb_build_object(
          'id', 'asset_' || md5(p.customizer_template_url),
          'url', p.customizer_template_url,
          'originalUrl', p.customizer_template_url,
          'label', 'Customizer mockup',
          'category', 'Mockup',
          'sourceProductId', p.source_product_id,
          'assetType', 'MOCKUP',
          'createdAt', now()::text
        )
      )
      ELSE '[]'::jsonb
    END AS assets
  FROM products p
  JOIN option_assets ON option_assets.id = p.id
  WHERE COALESCE(jsonb_array_length(p.customizer_assets), 0) = 0
)
UPDATE products p
SET
  customizer_assets = a.assets,
  -- Existing rows with personalization fields were imported before the
  -- personalized flag was persisted; make storefront behavior consistent.
  is_personalized = TRUE,
  updated_at = now()
FROM assets_to_write a
WHERE p.id = a.id;
