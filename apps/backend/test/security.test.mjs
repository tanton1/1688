import test, { before } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";

process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.SUPABASE_ANON_KEY = "";
process.env.NODE_ENV = "test";
process.env.DEMO_MODE = "false";
process.env.APIKEY_FUN_API_KEY = "";
process.env.APIKEY_FUN_GEMINI_KEY = "";
process.env.APIKEY_FUN_OPENAI_KEY = "";
process.env.APIKEY_FUN_IMAGE_KEY = "";

let request;
let ENV;
let assertSafePublicUrl;
let assertShopifyDomain;
let normalizeSourceStock;
let inMemoryProducts;
let inMemoryOrders;

before(async () => {
  ({ ENV } = await import("../dist/config/env.js"));
  ENV.NODE_ENV = "test";
  ENV.ADMIN_API_TOKEN = "test-admin-token";
  ENV.EXTENSION_API_KEY = "test-extension-token";
  ENV.CRON_SECRET = "test-cron-secret";
  const { app } = await import("../dist/app.js");
  request = supertest(app);
  ({ assertSafePublicUrl, assertShopifyDomain } = await import("../dist/utils/safe-network.js"));
  ({ normalizeSourceStock, inMemoryProducts } = await import("../dist/controllers/import.controller.js"));
  ({ inMemoryOrders } = await import("../dist/services/orders.service.js"));
});

test("health exposes security headers and request id", async () => {
  const response = await request.get("/health").expect(200);
  assert.equal(response.body.status, "ok");
  assert.ok(response.headers["x-request-id"]);
  assert.equal(response.headers["x-content-type-options"], "nosniff");
});

test("CORS permits same-origin deployment traffic and rejects unknown origins", async () => {
  const sameOrigin = await request.get("/health")
    .set("Host", "store.example.com")
    .set("Origin", "http://store.example.com")
    .expect(200);
  assert.equal(sameOrigin.headers["access-control-allow-origin"], "http://store.example.com");

  const denied = await request.get("/health")
    .set("Host", "store.example.com")
    .set("Origin", "https://attacker.example")
    .expect(403);
  assert.equal(denied.body.error, "CORS_ORIGIN_DENIED");
});

test("protected routes reject anonymous requests", async () => {
  const response = await request.get("/api/v1/products").expect(401);
  assert.equal(response.body.error, "AUTH_REQUIRED");
});

test("request validation rejects malformed clone URLs", async () => {
  const response = await request.post("/api/v1/clone/preview")
    .set("Authorization", "Bearer test-extension-token")
    .send({ url: "javascript:alert(1)" }).expect(400);
  assert.equal(response.body.error, "VALIDATION_ERROR");
});

test("oversized JSON payloads return 413", async () => {
  const response = await request.post("/api/v1/auth/login")
    .set("Content-Type", "application/json")
    .send({ email: "a@example.com", password: "x".repeat(5_300_000) }).expect(413);
  assert.equal(response.body.error, "PAYLOAD_TOO_LARGE");
});

test("SOURCING token cannot mutate admin pricing configuration", async () => {
  const response = await request.post("/api/v1/pricing/rules")
    .set("Authorization", "Bearer test-extension-token")
    .send({}).expect(403);
  assert.equal(response.body.error, "FORBIDDEN");
});

test("glossary response follows the admin contract", async () => {
  const response = await request.get("/api/v1/glossary")
    .set("Authorization", "Bearer test-extension-token").expect(200);
  assert.equal(typeof response.body.glossary, "object");
  assert.ok(Array.isArray(response.body.items));
  assert.equal(response.body.total, response.body.items.length);
});

test("cron needs its own secret and does not claim fake work", async () => {
  await request.post("/api/v1/sync/cron").set("Authorization", "Bearer wrong").expect(401);
  const response = await request.post("/api/v1/sync/cron")
    .set("Authorization", "Bearer test-cron-secret").expect(501);
  assert.equal(response.body.error, "NOT_IMPLEMENTED");
});

test("URL guard blocks loopback/private targets and restricts Shopify", async () => {
  await assert.rejects(() => assertSafePublicUrl("http://127.0.0.1/admin"), /nội bộ/);
  await assert.rejects(() => assertSafePublicUrl("http://[::1]/"), /nội bộ/);
  assert.throws(() => assertShopifyDomain("evil.example.com"), /myshopify/);
  assert.equal(assertShopifyDomain("demo-shop.myshopify.com"), "demo-shop.myshopify.com");
});

test("zero stock stays zero", () => {
  assert.equal(normalizeSourceStock(0), 0);
  assert.equal(normalizeSourceStock(undefined), 0);
  assert.equal(normalizeSourceStock(12), 12);
});

test("quality gate rejects an incomplete product", async () => {
  const id = "test-quality-gate";
  inMemoryProducts.set(id, {
    id, version: 1, slug: id, skuCode: "TEST-1", titleVI: "Thiếu dữ liệu", categoryName: "Test",
    primaryImage: "", galleryImages: [], status: "DRAFT", qualityScore: 0, minPriceVND: 0, maxPriceVND: 0,
    isTitleLocked: false, isDescLocked: false, isImagesLocked: false, isPriceAutoSync: false, isStockAutoSync: false,
    variants: [], sourceProductId: "test", sourceUrl: "https://detail.1688.com/offer/test.html", supplierName: "Test"
  });
  const response = await request.post(`/api/v1/products/${id}/publish`)
    .set("Authorization", "Bearer test-admin-token").expect(422);
  assert.equal(response.body.error, "QUALITY_GATE_FAILED");
  inMemoryProducts.delete(id);
});

test("generic product update cannot bypass the publish quality gate", async () => {
  const id = "test-publish-bypass";
  inMemoryProducts.set(id, {
    id, version: 1, slug: id, skuCode: "TEST-2", titleVI: "Sản phẩm", categoryName: "Test",
    primaryImage: "", galleryImages: [], status: "DRAFT", qualityScore: 0, minPriceVND: 0, maxPriceVND: 0,
    isTitleLocked: false, isDescLocked: false, isImagesLocked: false, isPriceAutoSync: false, isStockAutoSync: false,
    variants: [], sourceProductId: "source-2", sourceUrl: "https://detail.1688.com/offer/source-2.html", supplierName: "Test"
  });
  const response = await request.put(`/api/v1/products/${id}`)
    .set("Authorization", "Bearer test-admin-token")
    .send({ status: "PUBLISHED", version: 1 }).expect(409);
  assert.equal(response.body.error, "PUBLISH_ENDPOINT_REQUIRED");
  assert.equal(inMemoryProducts.get(id).status, "DRAFT");
  inMemoryProducts.delete(id);
});

test("optimistic version conflicts are reported", async () => {
  const id = "test-version-conflict";
  inMemoryProducts.set(id, {
    id, version: 2, slug: id, skuCode: "TEST-3", titleVI: "Sản phẩm", categoryName: "Test",
    primaryImage: "https://example.com/image.jpg", galleryImages: [], status: "DRAFT", qualityScore: 0, minPriceVND: 100000, maxPriceVND: 100000,
    isTitleLocked: false, isDescLocked: false, isImagesLocked: false, isPriceAutoSync: false, isStockAutoSync: false,
    variants: [], sourceProductId: "source-3", sourceUrl: "https://detail.1688.com/offer/source-3.html", supplierName: "Test"
  });
  const response = await request.put(`/api/v1/products/${id}`)
    .set("Authorization", "Bearer test-admin-token")
    .send({ titleVI: "Tên mới", version: 1 }).expect(409);
  assert.equal(response.body.error, "VERSION_CONFLICT");
  inMemoryProducts.delete(id);
});

test("default pricing rule cannot be deleted", async () => {
  const response = await request.delete("/api/v1/pricing/rules/DEFAULT_FASHION")
    .set("Authorization", "Bearer test-admin-token").expect(409);
  assert.equal(response.body.error, "PRICING_RULE_NOT_DELETABLE");
});

test("order tracking requires both order number and phone", async () => {
  const response = await request.post("/api/v1/store/orders/track")
    .send({ orderNumber: "HUB-123456" }).expect(400);
  assert.equal(response.body.error, "VALIDATION_ERROR");
});

test("checkout ignores client prices and hides internal sourcing costs", async () => {
  const id = "checkout-source-product";
  inMemoryProducts.set(id, {
    id, version: 1, slug: id, skuCode: "CHECKOUT-1", titleVI: "Sản phẩm checkout", categoryName: "Test",
    primaryImage: "https://example.com/image.jpg", galleryImages: [], status: "PUBLISHED", qualityScore: 100,
    minPriceVND: 200000, maxPriceVND: 200000, isTitleLocked: false, isDescLocked: false, isImagesLocked: false,
    isPriceAutoSync: true, isStockAutoSync: true, sourceProductId: "source-checkout",
    sourceUrl: "https://detail.1688.com/offer/source-checkout.html", supplierName: "Test",
    variants: [{ sourceSkuId: "VAR-1", costPriceVND: 80000, sellingPriceVND: 200000, stockQuantity: 5, sourceAvailable: true, selectedForSale: true }]
  });
  const catalog = await request.get("/api/v1/store/products").expect(200);
  const publicProduct = catalog.body.products.find(product => product.id === id);
  assert.ok(publicProduct);
  assert.equal(publicProduct.sourceUrl, "");
  assert.equal(publicProduct.sourceProductId, "");
  assert.equal(publicProduct.variants[0].costPriceVND, 0);
  assert.equal(publicProduct.variants[0].sourcePrice, undefined);
  const response = await request.post("/api/v1/store/orders").send({
    customerName: "Nguyen Van A", customerPhone: "0912345678", customerAddress: "123 Duong Test, Quan 1",
    paymentMethod: "COD",
    items: [{ productId: id, skuCode: "VAR-1", sourceSkuId: "VAR-1", variantName: "Mặc định", quantity: 1, sellingPriceVND: 1 }]
  }).expect(201);
  assert.equal(response.body.order.totalAmountVND, 230000);
  assert.equal(response.body.order.totalCostVND, 0);
  assert.equal(response.body.order.estimatedProfitVND, 0);
  assert.equal(response.body.order.items[0].sellingPriceVND, 200000);
  assert.equal(response.body.order.items[0].costVND, undefined);
  assert.equal(inMemoryProducts.get(id).variants[0].stockQuantity, 4);
  const tracked = await request.post("/api/v1/store/orders/track").send({
    orderNumber: response.body.orderNumber,
    customerPhone: "0912345678"
  }).expect(200);
  assert.equal(tracked.body.orders.length, 1);
  assert.equal(tracked.body.orders[0].estimatedProfitVND, 0);
  inMemoryProducts.delete(id);
  inMemoryOrders.clear();
});

test("connector endpoints reject browser-supplied secrets", async () => {
  const response = await request.post("/api/v1/connectors/shopify/sync")
    .set("Authorization", "Bearer test-admin-token")
    .send({ productId: "p1", config: { shopDomain: "demo.myshopify.com", accessToken: "secret" } })
    .expect(400);
  assert.equal(response.body.error, "VALIDATION_ERROR");
});

test("store connectors reject products that have not passed the publish gate", async () => {
  const id = "draft-connector-product";
  inMemoryProducts.set(id, {
    id, version: 1, slug: id, skuCode: "DRAFT-1", titleVI: "Sản phẩm chưa duyệt", categoryName: "Test",
    primaryImage: "https://example.com/image.jpg", galleryImages: [], status: "DRAFT", qualityScore: 40,
    minPriceVND: 100000, maxPriceVND: 100000, isTitleLocked: false, isDescLocked: false, isImagesLocked: false,
    isPriceAutoSync: false, isStockAutoSync: false, variants: [], sourceProductId: "source-draft",
    sourceUrl: "https://detail.1688.com/offer/source-draft.html", supplierName: "Test"
  });

  for (const connector of ["woocommerce", "shopify"]) {
    const response = await request.post(`/api/v1/connectors/${connector}/sync`)
      .set("Authorization", "Bearer test-admin-token")
      .send({ productId: id })
      .expect(409);
    assert.equal(response.body.error, "PRODUCT_NOT_PUBLISHED");
  }
  const exportResponse = await request.post("/api/v1/connectors/export-csv")
    .set("Authorization", "Bearer test-admin-token")
    .send({ productIds: [id], platform: "SHOPEE" })
    .expect(409);
  assert.equal(exportResponse.body.error, "PRODUCT_NOT_PUBLISHED");
  inMemoryProducts.delete(id);
});

test("template writes validate nested content and reject unknown fields", async () => {
  const response = await request.post("/api/v1/templates")
    .set("Authorization", "Bearer test-admin-token")
    .send({
      name: "Template lỗi",
      categoryName: "Test",
      content: { attributes: [{ key: "Chất liệu", value: 123 }] },
      variation: { options: [] },
      injectedAdmin: true
    })
    .expect(400);
  assert.equal(response.body.error, "VALIDATION_ERROR");
});

test("sourcing users cannot export the private catalog", async () => {
  await request.post("/api/v1/connectors/export-csv")
    .set("Authorization", "Bearer test-extension-token")
    .send({ productIds: ["product-1"], platform: "SHOPEE" })
    .expect(403);
});

test("extension OCR is authenticated and fails explicitly without a provider key", async () => {
  const response = await request.post("/api/v1/ai/translate-image")
    .set("Authorization", "Bearer test-extension-token")
    .send({ imageUrl: "https://example.com/product.jpg" })
    .expect(503);
  assert.equal(response.body.error, "AI_NOT_CONFIGURED");
});

test("AI endpoints fail explicitly when the server has no provider key", async () => {
  const id = "test-ai-not-configured";
  inMemoryProducts.set(id, {
    id, version: 1, slug: id, skuCode: "AI-1", titleVI: "Sản phẩm AI", categoryName: "Test",
    primaryImage: "https://example.com/image.jpg", galleryImages: [], status: "DRAFT", qualityScore: 50,
    minPriceVND: 100000, maxPriceVND: 100000, isTitleLocked: false, isDescLocked: false, isImagesLocked: false,
    isPriceAutoSync: false, isStockAutoSync: false, variants: [], sourceProductId: "source-ai",
    sourceUrl: "https://detail.1688.com/offer/source-ai.html", supplierName: "Test"
  });
  const response = await request.post("/api/v1/ai/generate-copy")
    .set("Authorization", "Bearer test-admin-token")
    .send({ productId: id, style: "AIDA", language: "VI" })
    .expect(503);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error, "AI_NOT_CONFIGURED");
  inMemoryProducts.delete(id);
});

test("VietQR checkout fails before stock reservation when bank details are missing", async () => {
  const id = "checkout-vietqr-no-bank";
  inMemoryProducts.set(id, {
    id, version: 1, slug: id, skuCode: "QR-1", titleVI: "Sản phẩm VietQR", categoryName: "Test",
    primaryImage: "https://example.com/image.jpg", galleryImages: [], status: "PUBLISHED", qualityScore: 100,
    minPriceVND: 150000, maxPriceVND: 150000, isTitleLocked: false, isDescLocked: false, isImagesLocked: false,
    isPriceAutoSync: true, isStockAutoSync: true, sourceProductId: "source-qr",
    sourceUrl: "https://detail.1688.com/offer/source-qr.html", supplierName: "Test",
    variants: [{ sourceSkuId: "QR-VAR-1", costPriceVND: 50000, sellingPriceVND: 150000, stockQuantity: 3, sourceAvailable: true, selectedForSale: true }]
  });

  const response = await request.post("/api/v1/store/orders").send({
    customerName: "Nguyen Van B", customerPhone: "0912345678", customerAddress: "123 Duong Test, Quan 1",
    paymentMethod: "VIETQR",
    items: [{ productId: id, skuCode: "QR-VAR-1", sourceSkuId: "QR-VAR-1", variantName: "Mặc định", quantity: 1, sellingPriceVND: 1 }]
  }).expect(503);

  assert.equal(response.body.error, "PAYMENT_NOT_CONFIGURED");
  assert.equal(inMemoryProducts.get(id).variants[0].stockQuantity, 3);
  inMemoryProducts.delete(id);
});

test("visual sourcing requires a product id or an image with a positive selling price", async () => {
  const missing = await request.post("/api/v1/clone/visual-sourcing")
    .set("Authorization", "Bearer test-extension-token")
    .send({ title: "Thiếu dữ liệu" })
    .expect(400);
  assert.equal(missing.body.error, "VALIDATION_ERROR");

  const zeroPrice = await request.post("/api/v1/clone/visual-sourcing")
    .set("Authorization", "Bearer test-extension-token")
    .send({ imageUrl: "https://example.com/product.jpg", currentSellingPriceVND: 0 })
    .expect(400);
  assert.equal(zeroPrice.body.error, "VALIDATION_ERROR");
});

test("imports reject zero normalized and variant source prices", async () => {
  const baseNormalized = {
    sourcePlatform: "1688",
    sourceProductId: "zero-price-source",
    sourceUrl: "https://detail.1688.com/offer/zero-price-source.html",
    supplier: { shopId: "shop-zero", shopName: "Shop Test", shopUrl: "https://example.com/shop" },
    moq: 0,
    titleCN: "测试产品",
    cleanedTitleCN: "测试产品",
    price: { currency: "CNY", min: 1, max: 1 },
    media: { images: [] },
    attributes: [],
    variants: [],
    description: { images: [] },
    rawSnapshot: { offerId: "zero-price-source", skuMap: {} }
  };
  const settings = {
    targetLanguage: "vi", translationMode: "ACCURATE", autoPublish: false,
    copyDescriptionImages: false
  };

  const normalizedPrice = await request.post("/api/v1/import/single")
    .set("Authorization", "Bearer test-extension-token")
    .send({ normalized: { ...baseNormalized, price: { currency: "CNY", min: 0, max: 1 } }, settings })
    .expect(400);
  assert.equal(normalizedPrice.body.error, "VALIDATION_ERROR");

  const variantPrice = await request.post("/api/v1/import/single")
    .set("Authorization", "Bearer test-extension-token")
    .send({
      normalized: {
        ...baseNormalized,
        variants: [{ sourceSkuId: "zero-variant", priceCNY: 0, stock: 1 }]
      },
      settings
    })
    .expect(400);
  assert.equal(variantPrice.body.error, "VALIDATION_ERROR");
});

test("AI model names outside the server allowlist are rejected before provider lookup", async () => {
  const id = "test-ai-model-allowlist";
  inMemoryProducts.set(id, {
    id, version: 1, slug: id, skuCode: "AI-2", titleVI: "Sản phẩm AI", categoryName: "Test",
    primaryImage: "https://example.com/image.jpg", galleryImages: [], status: "DRAFT", qualityScore: 50,
    minPriceVND: 100000, maxPriceVND: 100000, isTitleLocked: false, isDescLocked: false, isImagesLocked: false,
    isPriceAutoSync: false, isStockAutoSync: false, variants: [], sourceProductId: "source-ai-model",
    sourceUrl: "https://detail.1688.com/offer/source-ai-model.html", supplierName: "Test"
  });
  const response = await request.post("/api/v1/ai/generate-copy")
    .set("Authorization", "Bearer test-admin-token")
    .send({ productId: id, model: "untrusted/provider-model" })
    .expect(400);
  assert.equal(response.body.error, "AI_MODEL_NOT_SUPPORTED");
  inMemoryProducts.delete(id);
});
