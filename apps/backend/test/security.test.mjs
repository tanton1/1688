import test, { before } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";

process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.SUPABASE_ANON_KEY = "";
process.env.NODE_ENV = "test";

let request;
let ENV;
let assertSafePublicUrl;
let assertShopifyDomain;
let normalizeSourceStock;
let inMemoryProducts;

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
});

test("health exposes security headers and request id", async () => {
  const response = await request.get("/health").expect(200);
  assert.equal(response.body.status, "ok");
  assert.ok(response.headers["x-request-id"]);
  assert.equal(response.headers["x-content-type-options"], "nosniff");
});

test("protected routes reject anonymous requests", async () => {
  const response = await request.get("/api/v1/products").expect(401);
  assert.equal(response.body.error, "AUTH_REQUIRED");
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
