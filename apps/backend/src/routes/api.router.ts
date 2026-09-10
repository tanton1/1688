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
import { requireAuth, requireCronSecret, requireRole } from "../middleware/auth.js";

export const apiRouter = Router();

const importCtrl = new ImportController();
const syncCtrl = new SyncController();
const productsCtrl = new ProductsController();
const pricingCtrl = new PricingController();
const glossaryCtrl = new GlossaryController();
const connectorsCtrl = new StoreConnectorsController();
const ordersCtrl = new OrdersController();
const authCtrl = new AuthController();

// Public endpoints: login and platform metadata only.
apiRouter.post("/auth/login", (req, res) => authCtrl.login(req, res));
apiRouter.get("/clone/supported-platforms", (req, res) => cloneController.getSupportedPlatforms(req, res));
apiRouter.get("/sync/cron", requireCronSecret, (req, res) => syncCtrl.runCronSync(req, res));
apiRouter.post("/sync/cron", requireCronSecret, (req, res) => syncCtrl.runCronSync(req, res));

// Public Storefront Endpoints (Direct Built-in E-commerce)
apiRouter.get("/store/info", (req, res) => storefrontController.getStoreInfo(req, res));
apiRouter.get("/store/products", (req, res) => storefrontController.listPublicProducts(req, res));
apiRouter.get("/store/products/:idOrSlug", (req, res) => storefrontController.getProductDetail(req, res));
apiRouter.post("/store/orders", (req, res) => storefrontController.checkoutOrder(req, res));
apiRouter.get("/store/orders/track/:query", (req, res) => storefrontController.trackOrder(req, res));

apiRouter.use(requireAuth);
apiRouter.get("/auth/me", (req, res) => authCtrl.me(req, res));
apiRouter.post("/store/settings", requireRole("ADMIN"), (req, res) => storefrontController.updateStoreSettings(req, res));

// Multi-Platform Product Cloner (1688, Taobao, Tmall, Shopee, TikTok Shop, AliExpress, Universal Web)
apiRouter.post("/clone/preview", (req, res) => cloneController.preview(req, res));
apiRouter.post("/clone/execute", (req, res) => cloneController.execute(req, res));
apiRouter.post("/clone/batch", (req, res) => cloneController.batchClone(req, res));
apiRouter.post("/clone/visual-sourcing", (req, res) => cloneController.visualSourcing(req, res));



// 0. Dashboard Stats
apiRouter.get("/dashboard/stats", (req, res) => productsCtrl.getDashboardStats(req, res));

// 1. Ingestion & Duplicate Check
apiRouter.post("/sync/check-existing", (req, res) => importCtrl.checkExisting(req, res));
apiRouter.post("/import/single", (req, res) => importCtrl.importSingle(req, res));
apiRouter.post("/import/bulk", (req, res) => importCtrl.importBulk(req, res));
apiRouter.get("/import/jobs/:jobId", (req, res) => importCtrl.getJobStatus(req, res));

// 2. Sync, Diff Engine & Background Cron
apiRouter.post("/sync/trigger-check", (req, res) => syncCtrl.triggerCheck(req, res));
apiRouter.get("/sync/diff-logs", (req, res) => syncCtrl.getDiffLogs(req, res));
apiRouter.post("/sync/resolve-diff", (req, res) => syncCtrl.resolveDiff(req, res));

// 3. Web Products Management
apiRouter.get("/products", (req, res) => productsCtrl.listProducts(req, res));
apiRouter.post("/products/sync-batch", requireRole("ADMIN"), (req, res) => productsCtrl.syncBatch(req, res));
apiRouter.get("/products/:id", (req, res) => productsCtrl.getProductById(req, res));
apiRouter.put("/products/:id", (req, res) => productsCtrl.updateProduct(req, res));
apiRouter.patch("/products/:id/locks", (req, res) => productsCtrl.updateFieldLocks(req, res));
apiRouter.post("/products/:id/publish", (req, res) => productsCtrl.publishProduct(req, res));
apiRouter.delete("/products/:id", requireRole("ADMIN"), (req, res) => productsCtrl.deleteProduct(req, res));
apiRouter.post("/products/:id/mirror-images", (req, res) => productsCtrl.mirrorImages(req, res));
apiRouter.post("/products/bulk-publish", (req, res) => productsCtrl.bulkPublish(req, res));
apiRouter.post("/products/bulk-delete", requireRole("ADMIN"), (req, res) => productsCtrl.bulkDelete(req, res));

// 4. Pricing Rules & Calculator
apiRouter.get("/pricing/rules", (req, res) => pricingCtrl.getRules(req, res));
apiRouter.post("/pricing/calculate", (req, res) => pricingCtrl.calculate(req, res));
apiRouter.post("/pricing/rules", requireRole("ADMIN"), (req, res) => pricingCtrl.createRule(req, res));
apiRouter.put("/pricing/rules/:id", requireRole("ADMIN"), (req, res) => pricingCtrl.updateRule(req, res));
apiRouter.delete("/pricing/rules/:id", requireRole("ADMIN"), (req, res) => pricingCtrl.deleteRule(req, res));

// 5. Glossary
apiRouter.get("/glossary", (req, res) => glossaryCtrl.getGlossary(req, res));
apiRouter.post("/glossary", (req, res) => glossaryCtrl.setTerm(req, res));

// 6. Omnichannel Store Connectors (WooCommerce, Shopify, Shopee, TikTok Shop)
apiRouter.post("/connectors/woocommerce/sync", requireRole("ADMIN"), (req, res) => connectorsCtrl.syncWooCommerce(req, res));
apiRouter.post("/connectors/shopify/sync", requireRole("ADMIN"), (req, res) => connectorsCtrl.syncShopify(req, res));
apiRouter.post("/connectors/export-csv", (req, res) => connectorsCtrl.exportMarketplaceCSV(req, res));

// 7. Telegram Alerts
apiRouter.post("/connectors/telegram/test", requireRole("ADMIN"), (req, res) => connectorsCtrl.testTelegram(req, res));
apiRouter.post("/connectors/telegram/send-alert", requireRole("ADMIN"), (req, res) => connectorsCtrl.sendTelegramAlert(req, res));

// 8. AI Marketing Copywriter & Multimodal Vision (ChatGPT Luna/Sol 5.6 & Gemini Flash 6,7,8)
apiRouter.get("/ai/config", requireRole("ADMIN"), (req, res) => connectorsCtrl.getAiConfig(req, res));
apiRouter.post("/ai/config", requireRole("ADMIN"), (req, res) => connectorsCtrl.updateAiConfig(req, res));
apiRouter.post("/ai/generate-copy", (req, res) => connectorsCtrl.generateAICopy(req, res));
apiRouter.post("/ai/translate-image", (req, res) => connectorsCtrl.translateImage(req, res));
apiRouter.post("/ai/inpaint-image", (req, res) => connectorsCtrl.inpaintImage(req, res));

// 9. Customer Orders & 1688 Sourcing Assistant
apiRouter.get("/orders", (req, res) => ordersCtrl.listOrders(req, res));
apiRouter.get("/orders/:id", (req, res) => ordersCtrl.getOrderById(req, res));
apiRouter.post("/orders/webhook", (req, res) => ordersCtrl.createOrderWebhook(req, res));
apiRouter.patch("/orders/:id/status", (req, res) => ordersCtrl.updateOrderStatus(req, res));
apiRouter.delete("/orders/:id", requireRole("ADMIN"), (req, res) => ordersCtrl.deleteOrder(req, res));

// 10. Product Content & Variation Templates
apiRouter.get("/templates", (req, res) => templatesController.getTemplates(req, res));
apiRouter.get("/templates/:id", (req, res) => templatesController.getTemplateById(req, res));
apiRouter.post("/templates", requireRole("ADMIN"), (req, res) => templatesController.createTemplate(req, res));
apiRouter.put("/templates/:id", requireRole("ADMIN"), (req, res) => templatesController.updateTemplate(req, res));
apiRouter.delete("/templates/:id", requireRole("ADMIN"), (req, res) => templatesController.deleteTemplate(req, res));
apiRouter.post("/templates/reset-defaults", requireRole("ADMIN"), (req, res) => templatesController.resetDefaults(req, res));

