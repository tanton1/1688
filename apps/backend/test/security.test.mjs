import test, { before } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";

process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.SUPABASE_ANON_KEY = "";
process.env.SUPABASE_AUTH_URL = "";
process.env.SUPABASE_AUTH_ANON_KEY = "";
process.env.SUPABASE_AUTH_SERVICE_ROLE_KEY = "";
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

test("CORS permits a well-formed Chrome extension origin", async () => {
  const response = await request.get("/health")
    .set("Host", "store.example.com")
    .set("Origin", "chrome-extension://abcdefghijklmnopabcdefghijklmnop")
    .expect(200);
  assert.equal(response.headers["access-control-allow-origin"], "chrome-extension://abcdefghijklmnopabcdefghijklmnop");
});

test("CORS permits supported merchant origins used by content scripts", async () => {
  const response = await request.get("/health")
    .set("Host", "store.example.com")
    .set("Origin", "https://macorner.co")
    .expect(200);
  assert.equal(response.headers["access-control-allow-origin"], "https://macorner.co");
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

test("password recovery endpoints validate input and require a recovery token", async () => {
  const invalidEmail = await request.post("/api/v1/auth/password-reset/request")
    .send({ email: "not-an-email" }).expect(400);
  assert.equal(invalidEmail.body.error, "VALIDATION_ERROR");

  const missingToken = await request.post("/api/v1/auth/password-reset/confirm")
    .send({ password: "new-secure-password" }).expect(401);
  assert.equal(missingToken.body.error, "RECOVERY_TOKEN_REQUIRED");
});

test("auth refresh rejects a malformed refresh token before provider lookup", async () => {
  const response = await request.post("/api/v1/auth/refresh")
    .send({ refreshToken: "short" }).expect(400);
  assert.equal(response.body.error, "VALIDATION_ERROR");
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

test("storefront catalog filters and paginates personalized gift dimensions", async () => {
  const fixtures = [
    {
      id: "catalog-filter-1", slug: "bien-mica-ca-nhan-hoa", skuCode: "CAT-1", titleVI: "Biển mica cá nhân hóa",
      categoryName: "Biển Mica Đèn LED", occasionTags: ["anniversary"], recipientTags: ["for-couples"], isPersonalized: true,
      minPriceVND: 289000, maxPriceVND: 289000
    },
    {
      id: "catalog-filter-2", slug: "bien-mica-thuong", skuCode: "CAT-2", titleVI: "Biển mica tiêu chuẩn",
      categoryName: "Biển Mica Đèn LED", occasionTags: ["birthday"], recipientTags: ["for-dad"], isPersonalized: false,
      minPriceVND: 590000, maxPriceVND: 590000
    }
  ].map(product => ({
    ...product,
    version: 1,
    primaryImage: "https://example.com/product.jpg", galleryImages: [], status: "PUBLISHED", qualityScore: 100,
    isTitleLocked: false, isDescLocked: false, isImagesLocked: false, isPriceAutoSync: false, isStockAutoSync: false,
    sourceProductId: `source-${product.id}`, sourceUrl: `https://detail.1688.com/offer/${product.id}.html`, supplierName: "Test",
    variants: [{ sourceSkuId: `${product.skuCode}-VAR`, costPriceVND: 100000, sellingPriceVND: product.minPriceVND, stockQuantity: 5, sourceAvailable: true, selectedForSale: true }]
  }));
  fixtures.forEach(product => inMemoryProducts.set(product.id, product));

  const filtered = await request.get("/api/v1/store/products")
    .query({ collection: "bien-mica-den-led", occasion: "anniversary", recipient: "for-couples", personalized: "1", maxPrice: "299999", page: "1", limit: "1" })
    .expect(200);
  assert.equal(filtered.body.total, 1);
  assert.equal(filtered.body.page, 1);
  assert.equal(filtered.body.limit, 1);
  assert.deepEqual(filtered.body.products.map(product => product.id), ["catalog-filter-1"]);

  const paged = await request.get("/api/v1/store/products")
    .query({ collection: "bien-mica-den-led", sort: "PRICE_DESC", page: "2", limit: "1" })
    .expect(200);
  assert.equal(paged.body.total, 2);
  assert.equal(paged.body.products[0].id, "catalog-filter-1");

  fixtures.forEach(product => inMemoryProducts.delete(product.id));
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

test("AI template drafts keep unverified catalog data safe in demo mode", async () => {
  ENV.DEMO_MODE = true;
  try {
    const response = await request.post("/api/v1/ai/generate-template")
      .set("Authorization", "Bearer test-admin-token")
      .send({
        name: "Template thời trang nhanh",
        categoryName: "Thời Trang & May Mặc",
        targetPlatform: "ALL",
        brief: "Tạo Size và Màu để duyệt trước khi đăng"
      })
      .expect(200);

    assert.equal(response.body.success, true);
    assert.equal(response.body.mode, "DEMO");
    assert.ok(response.body.draft.content.attributes.length > 0);
    assert.ok(response.body.draft.content.attributes.every(attribute => /Cần xác minh/.test(attribute.value)));
    assert.ok(response.body.draft.variation.predefinedVariants.length > 0);
    assert.ok(response.body.draft.variation.predefinedVariants.every(variant => variant.stock === 0));
    assert.ok(response.body.draft.variation.predefinedVariants.every(variant => variant.priceAdjustmentVND === 0));
  } finally {
    ENV.DEMO_MODE = false;
  }
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

test("guest customization upload rejects bytes that do not match the declared image type", async () => {
  const response = await request.post("/api/v1/store/customizations/upload").send({
    dataUrl: `data:image/png;base64,${Buffer.from("not-a-real-png").toString("base64")}`,
    fileName: "avatar.png",
    guestSessionId: "11111111-1111-4111-8111-111111111111",
    width: 1200,
    height: 1200
  }).expect(400);
  assert.equal(response.body.error, "INVALID_IMAGE_SIGNATURE");

  const pngHeader = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(pngHeader, 0);
  pngHeader.writeUInt32BE(1, 16);
  pngHeader.writeUInt32BE(1, 20);
  const mismatch = await request.post("/api/v1/store/customizations/upload").send({
    dataUrl: `data:image/png;base64,${pngHeader.toString("base64")}`,
    fileName: "avatar.png",
    guestSessionId: "11111111-1111-4111-8111-111111111111",
    width: 1200,
    height: 1200
  }).expect(400);
  assert.equal(mismatch.body.error, "IMAGE_DIMENSIONS_MISMATCH");
});

test("personalized checkout enforces fields and stores a stable configuration id", async () => {
  const id = "checkout-personalized-product";
  inMemoryProducts.set(id, {
    id, version: 4, slug: id, skuCode: "CUSTOM-1", titleVI: "Quà cá nhân hóa", categoryName: "Test",
    primaryImage: "https://example.com/image.jpg", galleryImages: [], status: "PUBLISHED", qualityScore: 100,
    minPriceVND: 250000, maxPriceVND: 250000, isTitleLocked: false, isDescLocked: false, isImagesLocked: false,
    isPriceAutoSync: true, isStockAutoSync: true, sourceProductId: "source-custom",
    sourceUrl: "https://detail.1688.com/offer/source-custom.html", supplierName: "Test", isPersonalized: true,
    personalizationFields: [
      { id: "name", label: "Tên người nhận", type: "TEXT", required: true, maxLength: 20 },
      { id: "photo", label: "Ảnh chân dung", type: "IMAGE_UPLOAD", required: true, minImageWidth: 800, minImageHeight: 800 }
    ],
    variants: [{ sourceSkuId: "CUSTOM-VAR-1", costPriceVND: 90000, sellingPriceVND: 250000, stockQuantity: 3, sourceAvailable: true, selectedForSale: true }]
  });
  const baseOrder = {
    customerName: "Nguyen Van C", customerPhone: "0912345678", customerAddress: "123 Duong Test, Quan 1",
    paymentMethod: "COD",
    items: [{ productId: id, skuCode: "CUSTOM-VAR-1-CUST-11111111-1111-4111-8111-111111111111", sourceSkuId: "CUSTOM-VAR-1", variantName: "Mặc định", quantity: 1, sellingPriceVND: 1 }]
  };

  const incomplete = await request.post("/api/v1/store/orders").send(baseOrder).expect(422);
  assert.equal(incomplete.body.error, "PERSONALIZATION_INCOMPLETE");
  assert.ok(incomplete.body.fieldErrors.name);

  const customizationData = {
    name: "Gia Hân",
    photo: { url: "https://cdn.example.com/custom-photo.jpg", mimeType: "image/jpeg", width: 1200, height: 1200, sizeBytes: 120000 }
  };
  const missingId = await request.post("/api/v1/store/orders").send({
    ...baseOrder,
    items: [{ ...baseOrder.items[0], customizationData }]
  }).expect(422);
  assert.equal(missingId.body.error, "PERSONALIZATION_ID_REQUIRED");

  const customizationId = "11111111-1111-4111-8111-111111111111";
  const created = await request.post("/api/v1/store/orders").send({
    ...baseOrder,
    items: [{ ...baseOrder.items[0], customizationData, customizationId, customizationSchemaVersion: 4, customizedPreviewUrl: "https://cdn.example.com/preview.jpg" }]
  }).expect(201);
  assert.equal(created.body.order.items[0].customizationId, customizationId);
  assert.equal(created.body.order.items[0].customizationSchemaVersion, 4);
  assert.equal(created.body.order.items[0].customizedPreviewUrl, "https://cdn.example.com/preview.jpg");
  assert.equal(inMemoryProducts.get(id).variants[0].stockQuantity, 2);
  inMemoryProducts.delete(id);
  inMemoryOrders.clear();
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

test("single import preserves customizer metadata separately from the SKU matrix", async () => {
  const sourceId = "customizer-import-source";
  const response = await request.post("/api/v1/import/single")
    .set("Authorization", "Bearer test-extension-token")
    .send({
      normalized: {
        sourcePlatform: "GENERIC_WEB",
        sourceProductId: sourceId,
        sourceUrl: "https://macorner.co/products/customizer-import-source",
        supplier: { shopId: "shop-customizer", shopName: "Macorner", shopUrl: "https://macorner.co" },
        moq: 1,
        titleCN: "Custom Birth Flower Personalized Dish",
        cleanedTitleCN: "Custom Birth Flower Personalized Dish",
        price: { currency: "CNY", min: 10, max: 10 },
        media: {
          images: ["https://cdn.example.com/dish.jpg", "https://cdn.example.com/january.jpg"]
        },
        attributes: [],
        variants: [{
          sourceSkuId: "native-qty-1",
          colorCN: "1 PC",
          colorVI: "1 PC",
          priceCNY: 10,
          stock: 4,
          imageUrl: "https://cdn.example.com/dish.jpg"
        }],
        customOptionGroups: [{
          id: "birth-flower",
          name: "Birth flower",
          kind: "PERSONALIZATION",
          inputType: "ASSET_PICKER",
          source: "EXTERNAL_CUSTOMIZER",
          required: true,
          values: [{ id: "jan", label: "January", imageUrl: "https://cdn.example.com/january.jpg" }]
        }],
        description: { images: [] },
        rawSnapshot: {
          offerId: sourceId,
          skuMap: {
            "native-qty-1": { skuId: "native-qty-1", priceCNY: 10, stock: 4, attributes: {} }
          }
        }
      },
      settings: {
        targetLanguage: "vi",
        translationMode: "ACCURATE",
        autoPublish: false,
        copyDescriptionImages: false
      }
    })
    .expect(201);

  const product = response.body.product;
  assert.equal(product.isPersonalized, true);
  assert.equal(product.personalizationFields.length, 1);
  assert.equal(product.personalizationFields[0].type, "ASSET_PICKER");
  assert.equal(product.variants.length, 1);
  assert.equal(product.variants[0].sourceSkuId, "native-qty-1");
  assert.equal(product.variants[0].sourceSkuId.includes("__custom_"), false);
  assert.equal(product.personalizationFields[0].options[0].previewAssetUrl, "https://cdn.example.com/january.jpg");
  assert.ok(product.galleryImages.includes("https://cdn.example.com/january.jpg"));
  inMemoryProducts.delete(product.id);
});

test("resync updates source variants and personalization without overwriting locked merchandising fields", async () => {
  const sourceId = "customizer-resync-source";
  const productId = "existing-resync-product";
  inMemoryProducts.set(productId, {
    id: productId,
    version: 4,
    slug: "locked-jewelry-dish",
    skuCode: "MAC-LOCKED-1",
    titleVI: "Tên sản phẩm đã duyệt",
    titleEN: "Approved product title",
    shortDescVI: "Mô tả ngắn thủ công",
    fullDescVI: "Mô tả dài thủ công",
    categoryName: "Jewelry",
    primaryImage: "https://cdn.example.com/locked-primary.jpg",
    galleryImages: ["https://cdn.example.com/locked-gallery.jpg"],
    detailImages: ["https://cdn.example.com/locked-detail.jpg"],
    status: "PUBLISHED",
    qualityScore: 90,
    minPriceVND: 777000,
    maxPriceVND: 777000,
    isTitleLocked: true,
    isDescLocked: true,
    isImagesLocked: true,
    isPriceAutoSync: false,
    isStockAutoSync: true,
    variants: [{
      id: "old-variant",
      sourceSkuId: "native-qty-1",
      colorName: "1 PC",
      costPriceVND: 500000,
      sellingPriceVND: 777000,
      stockQuantity: 2,
      imageUrl: "https://cdn.example.com/locked-variant.jpg",
      sourceAvailable: true,
      selectedForSale: true
    }],
    sourceProductId: sourceId,
    sourceUrl: "https://macorner.co/products/customizer-resync-source",
    supplierName: "Macorner",
    createdAt: "2026-01-01T00:00:00.000Z"
  });

  const response = await request.post("/api/v1/import/single")
    .set("Authorization", "Bearer test-extension-token")
    .send({
      normalized: {
        sourcePlatform: "GENERIC_WEB",
        sourceProductId: sourceId,
        sourceUrl: "https://macorner.co/products/customizer-resync-source",
        supplier: { shopId: "shop-resync", shopName: "Macorner", shopUrl: "https://macorner.co" },
        moq: 1,
        titleCN: "New source title Personalized Jewelry Dish",
        cleanedTitleCN: "New source title Personalized Jewelry Dish",
        price: { currency: "CNY", min: 12, max: 12 },
        media: { images: ["https://cdn.example.com/new-primary.jpg", "https://cdn.example.com/new-gallery.jpg"] },
        attributes: [],
        variants: [{
          sourceSkuId: "native-qty-1",
          colorCN: "1 PC",
          colorVI: "1 PC",
          priceCNY: 12,
          stock: 9,
          imageUrl: "https://cdn.example.com/new-variant.jpg"
        }],
        customOptionGroups: [{
          id: "birth-flower",
          name: "Birth flower",
          kind: "PERSONALIZATION",
          inputType: "ASSET_PICKER",
          source: "EXTERNAL_CUSTOMIZER",
          required: true,
          values: [{ id: "jan", label: "January", imageUrl: "https://cdn.example.com/january.jpg" }]
        }],
        description: { images: [] },
        rawSnapshot: {
          offerId: sourceId,
          skuMap: {
            "native-qty-1": { skuId: "native-qty-1", priceCNY: 12, stock: 9, attributes: {} }
          }
        }
      },
      settings: {
        targetLanguage: "vi",
        translationMode: "ACCURATE",
        autoPublish: false,
        copyDescriptionImages: false,
        resyncExisting: true
      }
    })
    .expect(201);

  const product = response.body.product;
  assert.equal(product.id, productId);
  assert.equal(product.slug, "locked-jewelry-dish");
  assert.equal(product.version, 5);
  assert.equal(product.titleVI, "Tên sản phẩm đã duyệt");
  assert.equal(product.fullDescVI, "Mô tả dài thủ công");
  assert.equal(product.primaryImage, "https://cdn.example.com/locked-primary.jpg");
  assert.equal(product.variants[0].sellingPriceVND, 777000);
  assert.equal(product.variants[0].stockQuantity, 9);
  assert.equal(product.isPersonalized, true);
  assert.equal(product.personalizationFields[0].label, "Birth flower");
  assert.equal(product.personalizationFields[0].options[0].previewAssetUrl, "https://cdn.example.com/january.jpg");
  inMemoryProducts.delete(productId);
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
