import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";

const { buildCustomInventoryPayload, buildCustomStorePayload } = await import("../dist/services/custom-store-connector.service.js");

const product = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "personalized-gift",
  skuCode: "GIFT-1",
  titleVI: "Quà tặng cá nhân hóa",
  fullDescVI: "<p>Nội dung</p>",
  categoryName: "Quà tặng",
  primaryImage: "https://example.com/main.jpg",
  galleryImages: ["https://example.com/gallery.jpg"],
  detailImages: [],
  status: "PUBLISHED",
  minPriceVND: 100000,
  maxPriceVND: 120000,
  isPersonalized: true,
  personalizationFields: [{ id: "name", label: "Tên", type: "TEXT", required: true }],
  variants: [
    { sourceSkuId: "RED", colorName: "Đỏ", costPriceVND: 50000, sellingPriceVND: 100000, stockQuantity: 3, sourceAvailable: true, selectedForSale: true },
    { sourceSkuId: "HIDDEN", costPriceVND: 50000, sellingPriceVND: 120000, stockQuantity: 9, sourceAvailable: true, selectedForSale: false }
  ]
};

test("generic website payload preserves variants, images and personalization", () => {
  const payload = buildCustomStorePayload(product);
  assert.equal(payload.sourceProductId, product.id);
  assert.equal(payload.variants.length, 1);
  assert.equal(payload.variants[0].sku, "RED");
  assert.equal(payload.personalization.enabled, true);
  assert.equal(payload.personalization.fields[0].id, "name");
  assert.equal(payload.images.primary, product.primaryImage);
});

test("generic inventory payload contains only sellable SKU price and stock", () => {
  const payload = buildCustomInventoryPayload(product, "remote-42");
  assert.equal(payload.externalProductId, "remote-42");
  assert.deepEqual(payload.variants, [{ sku: "RED", price: 100000, stock: 3, available: true }]);
});
