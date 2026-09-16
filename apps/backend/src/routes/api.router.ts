import { Router } from "express";
import { ImportController } from "../controllers/import.controller.js";
import { SyncController } from "../controllers/sync.controller.js";
import { ProductsController } from "../controllers/products.controller.js";
import { PricingController } from "../controllers/pricing.controller.js";
import { GlossaryController } from "../controllers/glossary.controller.js";
import { StoreConnectorsController } from "../controllers/store-connectors.controller.js";
import { OrdersController } from "../controllers/orders.controller.js";
import { cloneController } from "../controllers/clone.controller.js";
import { templatesController } from "../controllers/templates.controller.js";
import { AuthController } from "../controllers/auth.controller.js";
import { storefrontController } from "../controllers/storefront.controller.js";
import { requireAuth, requireCronSecret, requirePersistence, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import {
  aiGenerateCopySchema,
  aiGenerateTemplateSchema,
  aiInpaintImageSchema,
  aiTranslateImageSchema,
  bulkImportSchema,
  checkExistingSchema,
  checkoutSchema,
  exportCsvSchema,
  importSingleSchema,
  lockUpdateSchema,
  orderStatusSchema,
  orderWebhookSchema,
  productUpdateSchema,
  resolveDiffSchema,
  shopeeAppConfigSchema,
  shopeeAuthorizationSchema,
  shopeeInventorySyncSchema,
  shopeeListingDraftSchema,
  shopifySyncSchema,
  storeSettingsSchema,
  storefrontCustomizationUploadSchema,
  templateCreateSchema,
  templateUpdateSchema,
  trackOrderSchema,
  triggerDiffSchema,
  visualSourcingSchema,
  wooCommerceSyncSchema,
  telegramTestSchema,
  telegramAlertSchema
} from "../validation/api.schemas.js";

export const apiRouter = Router();

const importCtrl = new ImportController();
const syncCtrl = new SyncController();
const productsCtrl = new ProductsController();
const pricingCtrl = new PricingController();
const glossaryCtrl = new GlossaryController();
const connectorsCtrl = new StoreConnectorsController();
const ordersCtrl = new OrdersController();
const authCtrl = new AuthController();
const urlSchema = z.string().url().refine(value => value.startsWith("https://") || value.startsWith("http://"));
const clonePreviewSchema = z.object({ url: urlSchema, platform: z.string().max(40).optional() });
const cloneExecuteSchema = z.object({ url: urlSchema, platform: z.string().max(40).optional(), customTitle: z.string().max(250).optional(), pricingRuleId: z.string().max(64).optional(), categoryName: z.string().max(120).optional(), autoPublish: z.boolean().optional(), mirrorMedia: z.boolean().optional() });
const cloneBatchSchema = z.object({ urls: z.array(urlSchema).min(1).max(50), pricingRuleId: z.string().max(64).optional(), categoryName: z.string().max(120).optional(), autoPublish: z.boolean().optional() });
const idsSchema = z.object({ ids: z.array(z.string().min(1).max(128)).min(1).max(100) });
const trackingLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "TRACKING_RATE_LIMITED", message: "Quá nhiều lượt tra cứu; vui lòng thử lại sau" }
});
const loginLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "LOGIN_RATE_LIMITED" } });
const passwordResetLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 5, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "PASSWORD_RESET_RATE_LIMITED", message: "Đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau." } });
const checkoutLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "CHECKOUT_RATE_LIMITED" } });
const customizationUploadLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "UPLOAD_RATE_LIMITED", message: "Đã tải quá nhiều ảnh; vui lòng thử lại sau" } });
const aiLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "AI_RATE_LIMITED" } });
const shopeeCallbackLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "SHOPEE_CALLBACK_RATE_LIMITED" } });

// Public endpoints: login and platform metadata only.
apiRouter.post("/auth/login", loginLimiter, (req, res) => authCtrl.login(req, res));
apiRouter.post("/auth/refresh", loginLimiter, (req, res) => authCtrl.refresh(req, res));
apiRouter.post("/auth/password-reset/request", passwordResetLimiter, (req, res) => authCtrl.requestPasswordReset(req, res));
apiRouter.post("/auth/password-reset/confirm", passwordResetLimiter, (req, res) => authCtrl.confirmPasswordReset(req, res));
apiRouter.get("/clone/supported-platforms", (req, res) => cloneController.getSupportedPlatforms(req, res));
apiRouter.get("/connectors/shopee/callback", shopeeCallbackLimiter, (req, res) => connectorsCtrl.handleShopeeCallback(req, res));
apiRouter.get("/sync/cron", requireCronSecret, (req, res) => syncCtrl.runCronSync(req, res));
apiRouter.post("/sync/cron", requireCronSecret, (req, res) => syncCtrl.runCronSync(req, res));

// Public Storefront Endpoints (Direct Built-in E-commerce)
apiRouter.get("/store/info", (req, res) => storefrontController.getStoreInfo(req, res));
apiRouter.get("/store/products", (req, res) => storefrontController.listPublicProducts(req, res));
apiRouter.get("/store/products/:idOrSlug", (req, res) => storefrontController.getProductDetail(req, res));
apiRouter.post("/store/customizations/upload", customizationUploadLimiter, validateBody(storefrontCustomizationUploadSchema), (req, res) => storefrontController.uploadCustomizationImage(req, res));
apiRouter.post("/store/orders", checkoutLimiter, requirePersistence, validateBody(checkoutSchema), (req, res) => storefrontController.checkoutOrder(req, res));
apiRouter.post("/store/orders/track", trackingLimiter, validateBody(trackOrderSchema), (req, res) => storefrontController.trackOrder(req, res));

apiRouter.use(requireAuth);
apiRouter.get("/auth/me", (req, res) => authCtrl.me(req, res));
apiRouter.post("/store/settings", requireRole("ADMIN"), requirePersistence, validateBody(storeSettingsSchema), (req, res) => storefrontController.updateStoreSettings(req, res));

// Multi-Platform Product Cloner (1688, Taobao, Tmall, Shopee, TikTok Shop, AliExpress, Universal Web)
apiRouter.post("/clone/preview", validateBody(clonePreviewSchema), (req, res) => cloneController.preview(req, res));
apiRouter.post("/clone/execute", requirePersistence, validateBody(cloneExecuteSchema), (req, res) => cloneController.execute(req, res));
apiRouter.post("/clone/batch", requirePersistence, validateBody(cloneBatchSchema), (req, res) => cloneController.batchClone(req, res));
apiRouter.post("/clone/visual-sourcing", aiLimiter, validateBody(visualSourcingSchema), (req, res) => cloneController.visualSourcing(req, res));



// 0. Dashboard Stats
apiRouter.get("/dashboard/stats", (req, res) => productsCtrl.getDashboardStats(req, res));

// 1. Ingestion & Duplicate Check
apiRouter.post("/sync/check-existing", validateBody(checkExistingSchema), (req, res) => importCtrl.checkExisting(req, res));
apiRouter.post("/import/single", requirePersistence, validateBody(importSingleSchema), (req, res) => importCtrl.importSingle(req, res));
apiRouter.post("/import/bulk", requirePersistence, validateBody(bulkImportSchema), (req, res) => importCtrl.importBulk(req, res));
apiRouter.get("/import/jobs/:jobId", (req, res) => importCtrl.getJobStatus(req, res));

// 2. Sync, Diff Engine & Background Cron
apiRouter.post("/sync/trigger-check", requirePersistence, validateBody(triggerDiffSchema), (req, res) => syncCtrl.triggerCheck(req, res));
apiRouter.get("/sync/diff-logs", (req, res) => syncCtrl.getDiffLogs(req, res));
apiRouter.post("/sync/resolve-diff", requirePersistence, validateBody(resolveDiffSchema), (req, res) => syncCtrl.resolveDiff(req, res));

// 3. Web Products Management
apiRouter.get("/products", (req, res) => productsCtrl.listProducts(req, res));
apiRouter.get("/products/customizer-assets", (req, res) => productsCtrl.listCustomizerAssets(req, res));
apiRouter.post("/products/sync-batch", requireRole("ADMIN"), (req, res) => productsCtrl.syncBatch(req, res));
apiRouter.get("/products/:id", (req, res) => productsCtrl.getProductById(req, res));
apiRouter.put("/products/:id", requirePersistence, validateBody(productUpdateSchema), (req, res) => productsCtrl.updateProduct(req, res));
apiRouter.patch("/products/:id/locks", requirePersistence, validateBody(lockUpdateSchema), (req, res) => productsCtrl.updateFieldLocks(req, res));
apiRouter.post("/products/:id/publish", requirePersistence, (req, res) => productsCtrl.publishProduct(req, res));
apiRouter.delete("/products/:id", requireRole("ADMIN"), requirePersistence, (req, res) => productsCtrl.deleteProduct(req, res));
apiRouter.post("/products/:id/mirror-images", requirePersistence, (req, res) => productsCtrl.mirrorImages(req, res));
apiRouter.post("/products/bulk-publish", requirePersistence, validateBody(idsSchema), (req, res) => productsCtrl.bulkPublish(req, res));
apiRouter.post("/products/bulk-delete", requireRole("ADMIN"), requirePersistence, validateBody(idsSchema), (req, res) => productsCtrl.bulkDelete(req, res));

// 4. Pricing Rules & Calculator
apiRouter.get("/pricing/rules", (req, res) => pricingCtrl.getRules(req, res));
apiRouter.post("/pricing/calculate", (req, res) => pricingCtrl.calculate(req, res));
apiRouter.post("/pricing/rules", requireRole("ADMIN"), requirePersistence, (req, res) => pricingCtrl.createRule(req, res));
apiRouter.put("/pricing/rules/:id", requireRole("ADMIN"), requirePersistence, (req, res) => pricingCtrl.updateRule(req, res));
apiRouter.delete("/pricing/rules/:id", requireRole("ADMIN"), requirePersistence, (req, res) => pricingCtrl.deleteRule(req, res));

// 5. Glossary
apiRouter.get("/glossary", (req, res) => glossaryCtrl.getGlossary(req, res));
apiRouter.post("/glossary", requirePersistence, (req, res) => glossaryCtrl.setTerm(req, res));

// 6. Omnichannel Store Connectors (WooCommerce, Shopify, Shopee, TikTok Shop)
apiRouter.post("/connectors/woocommerce/sync", requireRole("ADMIN"), validateBody(wooCommerceSyncSchema), (req, res) => connectorsCtrl.syncWooCommerce(req, res));
apiRouter.post("/connectors/shopify/sync", requireRole("ADMIN"), validateBody(shopifySyncSchema), (req, res) => connectorsCtrl.syncShopify(req, res));
apiRouter.post("/connectors/export-csv", requireRole("ADMIN"), validateBody(exportCsvSchema), (req, res) => connectorsCtrl.exportMarketplaceCSV(req, res));
apiRouter.get("/connectors/shopee/status", requireRole("ADMIN"), (req, res) => connectorsCtrl.getShopeeStatus(req, res));
apiRouter.get("/connectors/shopee/app-config", requireRole("ADMIN"), (req, res) => connectorsCtrl.getShopeeAppConfig(req, res));
apiRouter.get("/connectors/shopee/app-configs", requireRole("ADMIN"), (req, res) => connectorsCtrl.listShopeeAppConfigs(req, res));
apiRouter.put("/connectors/shopee/app-config", requireRole("ADMIN"), requirePersistence, validateBody(shopeeAppConfigSchema), (req, res) => connectorsCtrl.saveShopeeAppConfig(req, res));
apiRouter.get("/connectors/shopee/dashboard", requireRole("ADMIN"), (req, res) => connectorsCtrl.getShopeeDashboard(req, res));
apiRouter.get("/connectors/shopee/accounts", requireRole("ADMIN"), (req, res) => connectorsCtrl.listShopeeAccounts(req, res));
apiRouter.post("/connectors/shopee/accounts/:id/refresh", requireRole("ADMIN"), (req, res) => connectorsCtrl.refreshShopeeAccount(req, res));
apiRouter.delete("/connectors/shopee/accounts/:id", requireRole("ADMIN"), requirePersistence, (req, res) => connectorsCtrl.disconnectShopeeAccount(req, res));
apiRouter.post("/connectors/shopee/inventory-sync", requireRole("ADMIN"), requirePersistence, validateBody(shopeeInventorySyncSchema), (req, res) => connectorsCtrl.syncShopeeInventory(req, res));
apiRouter.post("/connectors/shopee/authorization-url", requireRole("ADMIN"), validateBody(shopeeAuthorizationSchema), (req, res) => connectorsCtrl.getShopeeAuthorizationUrl(req, res));
apiRouter.get("/connectors/shopee/categories", requireRole("ADMIN"), (req, res) => connectorsCtrl.getShopeeCategories(req, res));
apiRouter.get("/connectors/shopee/categories/:categoryId/attributes", requireRole("ADMIN"), (req, res) => connectorsCtrl.getShopeeAttributes(req, res));
apiRouter.get("/connectors/shopee/logistics", requireRole("ADMIN"), (req, res) => connectorsCtrl.getShopeeLogistics(req, res));
apiRouter.post("/connectors/shopee/listings/validate", requireRole("ADMIN"), validateBody(shopeeListingDraftSchema), (req, res) => connectorsCtrl.validateShopeeListing(req, res));
apiRouter.post("/connectors/shopee/listings/publish", requireRole("ADMIN"), requirePersistence, validateBody(shopeeListingDraftSchema), (req, res) => connectorsCtrl.publishShopeeListing(req, res));
apiRouter.get("/connectors/shopee/listings", requireRole("ADMIN"), (req, res) => connectorsCtrl.listShopeeListings(req, res));

// 7. Telegram Alerts
apiRouter.post("/connectors/telegram/test", requireRole("ADMIN"), validateBody(telegramTestSchema), (req, res) => connectorsCtrl.testTelegram(req, res));
apiRouter.post("/connectors/telegram/send-alert", requireRole("ADMIN"), validateBody(telegramAlertSchema), (req, res) => connectorsCtrl.sendTelegramAlert(req, res));

// 8. AI Marketing Copywriter & Multimodal Vision (ChatGPT Luna/Sol 5.6 & Gemini Flash 6,7,8)
apiRouter.get("/ai/config", requireRole("ADMIN"), (req, res) => connectorsCtrl.getAiConfig(req, res));
apiRouter.post("/ai/config", requireRole("ADMIN"), (req, res) => connectorsCtrl.updateAiConfig(req, res));
apiRouter.post("/ai/generate-copy", aiLimiter, requireRole("ADMIN"), validateBody(aiGenerateCopySchema), (req, res) => connectorsCtrl.generateAICopy(req, res));
apiRouter.post("/ai/generate-template", aiLimiter, requireRole("ADMIN"), validateBody(aiGenerateTemplateSchema), (req, res) => connectorsCtrl.generateTemplateDraft(req, res));
apiRouter.post("/ai/translate-image", aiLimiter, requireRole("ADMIN", "SOURCING"), validateBody(aiTranslateImageSchema), (req, res) => connectorsCtrl.translateImage(req, res));
apiRouter.post("/ai/inpaint-image", aiLimiter, requireRole("ADMIN"), validateBody(aiInpaintImageSchema), (req, res) => connectorsCtrl.inpaintImage(req, res));

// 9. Customer Orders & 1688 Sourcing Assistant
apiRouter.get("/orders", (req, res) => ordersCtrl.listOrders(req, res));
apiRouter.get("/orders/:id", (req, res) => ordersCtrl.getOrderById(req, res));
apiRouter.post("/orders/webhook", requirePersistence, validateBody(orderWebhookSchema), (req, res) => ordersCtrl.createOrderWebhook(req, res));
apiRouter.patch("/orders/:id/status", requirePersistence, validateBody(orderStatusSchema), (req, res) => ordersCtrl.updateOrderStatus(req, res));
apiRouter.delete("/orders/:id", requireRole("ADMIN"), requirePersistence, (req, res) => ordersCtrl.deleteOrder(req, res));

// 10. Product Content & Variation Templates
apiRouter.get("/templates", (req, res) => templatesController.getTemplates(req, res));
apiRouter.get("/templates/:id", (req, res) => templatesController.getTemplateById(req, res));
apiRouter.post("/templates", requireRole("ADMIN"), requirePersistence, validateBody(templateCreateSchema), (req, res) => templatesController.createTemplate(req, res));
apiRouter.put("/templates/:id", requireRole("ADMIN"), requirePersistence, validateBody(templateUpdateSchema), (req, res) => templatesController.updateTemplate(req, res));
apiRouter.delete("/templates/:id", requireRole("ADMIN"), requirePersistence, (req, res) => templatesController.deleteTemplate(req, res));
apiRouter.post("/templates/reset-defaults", requireRole("ADMIN"), requirePersistence, (req, res) => templatesController.resetDefaults(req, res));
