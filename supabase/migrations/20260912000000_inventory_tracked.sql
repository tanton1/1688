-- Compatibility migration for source platforms (e.g. Shopify/Macorner)
-- that expose availability without a numeric inventory quantity.
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS inventory_tracked BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS source_available BOOLEAN NOT NULL DEFAULT TRUE;

CREATE OR REPLACE FUNCTION create_storefront_order_atomic(p_order JSONB, p_reservations JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    reservation JSONB;
    created_id UUID := (p_order->>'id')::UUID;
BEGIN
    FOR reservation IN SELECT value FROM jsonb_array_elements(p_reservations)
    LOOP
        UPDATE product_variants AS variant
        SET stock_quantity = CASE
                WHEN variant.inventory_tracked THEN variant.stock_quantity - (reservation->>'quantity')::INTEGER
                ELSE variant.stock_quantity
            END,
            source_available = CASE
                WHEN variant.inventory_tracked THEN (variant.stock_quantity - (reservation->>'quantity')::INTEGER) > 0
                ELSE variant.source_available
            END,
            updated_at = NOW()
        WHERE variant.product_id = (reservation->>'productId')::UUID
          AND variant.source_sku_id = reservation->>'sourceSkuId'
          AND variant.selected_for_sale = TRUE
          AND variant.source_available = TRUE
          AND (NOT variant.inventory_tracked OR variant.stock_quantity >= (reservation->>'quantity')::INTEGER)
          AND variant.selling_price_vnd = (reservation->>'expectedBasePriceVND')::NUMERIC
          AND EXISTS (SELECT 1 FROM products p WHERE p.id = variant.product_id AND p.status = 'PUBLISHED');

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
