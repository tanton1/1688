import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.CHANNEL_TOKEN_ENCRYPTION_KEY = "";
process.env.SHOPEE_PARTNER_ID = "";
process.env.SHOPEE_PARTNER_KEY = "";

const {
  buildShopeeItemPayload,
  validateShopeeListing
} = await import("../dist/services/shopee-connector.service.js");

const product = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "qua-tang-ca-nhan-hoa",
  skuCode: "GIFT-1",
  titleVI: "Quà tặng cá nhân hóa cho gia đình",
  fullDescVI: "<p>Món quà cá nhân hóa với thiết kế riêng, phù hợp cho nhiều dịp đặc biệt.</p>",
  categoryName: "Quà tặng",
  primaryImage: "https://example.com/main.jpg",
  galleryImages: ["https://example.com/2.jpg", "https://example.com/3.jpg"],
  status: "PUBLISHED",
  qualityScore: 100,
  minPriceVND: 200000,
  maxPriceVND: 250000,
  isTitleLocked: false,
  isDescLocked: false,
  isImagesLocked: false,
  isPriceAutoSync: true,
  isStockAutoSync: true,
  sourceProductId: "source-1",
  sourceUrl: "https://example.com/source",
  supplierName: "Test",
  variants: [
    { id: "v1", sourceSkuId: "RED-S", colorName: "Đỏ", sizeName: "S", costPriceVND: 80000, sellingPriceVND: 200000, stockQuantity: 10, imageUrl: "https://example.com/red.jpg", sourceAvailable: true, selectedForSale: true },
    { id: "v2", sourceSkuId: "RED-M", colorName: "Đỏ", sizeName: "M", costPriceVND: 80000, sellingPriceVND: 210000, stockQuantity: 8, imageUrl: "https://example.com/red.jpg", sourceAvailable: true, selectedForSale: true },
    { id: "v3", sourceSkuId: "BLUE-S", colorName: "Xanh", sizeName: "S", costPriceVND: 90000, sellingPriceVND: 220000, stockQuantity: 6, imageUrl: "https://example.com/blue.jpg", sourceAvailable: true, selectedForSale: true }
  ]
};

const validDraft = {
  productId: product.id,
  title: product.titleVI,
  description: product.fullDescVI,
  categoryId: "100001",
  weightKg: 0.35,
  dimensions: { lengthCm: 20, widthCm: 15, heightCm: 5 },
  attributes: [{ attributeId: "12", valueId: "1201" }],
  requiredAttributeIds: ["12"],
  logistics: [{ logisticId: "80014", enabled: true }],
  selectedVariantIds: ["v1", "v2", "v3"],
  primaryVariationName: "Màu sắc",
  secondaryVariationName: "Kích thước",
  stockBuffer: 2,
  priceAdjustmentPercent: 10
};

test("Shopee readiness reports exact blocking fields", () => {
  const result = validateShopeeListing(product, {
    ...validDraft,
    categoryId: "",
    weightKg: 0,
    attributes: [],
    logistics: []
  });
  assert.equal(result.isReady, false);
  assert.ok(result.issues.some(issue => issue.code === "CATEGORY_REQUIRED" && issue.field === "categoryId"));
  assert.ok(result.issues.some(issue => issue.code === "WEIGHT_REQUIRED" && issue.field === "weightKg"));
  assert.ok(result.issues.some(issue => issue.code === "LOGISTICS_REQUIRED" && issue.field === "logistics"));
  assert.ok(result.issues.some(issue => issue.code === "ATTRIBUTE_REQUIRED" && issue.field === "attribute:12"));
});

test("Shopee readiness accepts a complete published product", () => {
  const result = validateShopeeListing(product, validDraft);
  assert.equal(result.isReady, true);
  assert.equal(result.stats.selectedVariants, 3);
  assert.equal(result.stats.variantsWithImages, 3);
  assert.equal(result.stats.totalStock, 24);
});

test("Shopee payload maps variation images, price adjustment and safe stock", () => {
  const payload = buildShopeeItemPayload(
    product,
    validDraft,
    ["main-1", "main-2", "main-3"],
    new Map([["Đỏ", "image-red"], ["Xanh", "image-blue"]])
  );
  assert.equal(payload.item_name, product.titleVI);
  assert.equal(payload.tier_variation.length, 2);
  assert.equal(payload.tier_variation[0].option_list[0].image.image_id, "image-red");
  assert.equal(payload.model.length, 3);
  assert.equal(payload.model[0].original_price, 220000);
  assert.equal(payload.model[0].seller_stock[0].stock, 8);
  assert.deepEqual(payload.model[2].tier_index, [1, 0]);
});
