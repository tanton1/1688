import { Router } from "express";
import { ImportController } from "../controllers/import.controller.js";
import { SyncController } from "../controllers/sync.controller.js";
import { ProductsController } from "../controllers/products.controller.js";
import { PricingController } from "../controllers/pricing.controller.js";
import { GlossaryController } from "../controllers/glossary.controller.js";
import { StoreConnectorsController } from "../controllers/store-connectors.controller.js";
import { OrdersController } from "../controllers/orders.controller.js";
import { cloneController } from "../controllers/clone.controller.js";

export const apiRouter = Router();

const importCtrl = new ImportController();
const syncCtrl = new SyncController();
const productsCtrl = new ProductsController();
const pricingCtrl = new PricingController();
const glossaryCtrl = new GlossaryController();
const connectorsCtrl = new StoreConnectorsController();
const ordersCtrl = new OrdersController();

// Multi-Platform Product Cloner (1688, Taobao, Tmall, Shopee, TikTok Shop, AliExpress, Universal Web)
apiRouter.get("/clone/supported-platforms", (req, res) => cloneController.getSupportedPlatforms(req, res));
apiRouter.post("/clone/preview", (req, res) => cloneController.preview(req, res));
apiRouter.post("/clone/execute", (req, res) => cloneController.execute(req, res));


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
apiRouter.get("/sync/cron", (req, res) => syncCtrl.runCronSync(req, res));
apiRouter.post("/sync/cron", (req, res) => syncCtrl.runCronSync(req, res));

// 3. Web Products Management
apiRouter.get("/products", (req, res) => productsCtrl.listProducts(req, res));
apiRouter.get("/products/:id", (req, res) => productsCtrl.getProductById(req, res));
apiRouter.put("/products/:id", (req, res) => productsCtrl.updateProduct(req, res));
apiRouter.patch("/products/:id/locks", (req, res) => productsCtrl.updateFieldLocks(req, res));
apiRouter.post("/products/:id/publish", (req, res) => productsCtrl.publishProduct(req, res));
apiRouter.delete("/products/:id", (req, res) => productsCtrl.deleteProduct(req, res));
apiRouter.post("/products/bulk-publish", (req, res) => productsCtrl.bulkPublish(req, res));
apiRouter.post("/products/bulk-delete", (req, res) => productsCtrl.bulkDelete(req, res));

// 4. Pricing Rules & Calculator
apiRouter.get("/pricing/rules", (req, res) => pricingCtrl.getRules(req, res));
apiRouter.post("/pricing/calculate", (req, res) => pricingCtrl.calculate(req, res));

// 5. Glossary
apiRouter.get("/glossary", (req, res) => glossaryCtrl.getGlossary(req, res));
apiRouter.post("/glossary", (req, res) => glossaryCtrl.setTerm(req, res));

// 6. Omnichannel Store Connectors (WooCommerce, Shopify, Shopee, TikTok Shop)
apiRouter.post("/connectors/woocommerce/sync", (req, res) => connectorsCtrl.syncWooCommerce(req, res));
apiRouter.post("/connectors/shopify/sync", (req, res) => connectorsCtrl.syncShopify(req, res));
apiRouter.post("/connectors/export-csv", (req, res) => connectorsCtrl.exportMarketplaceCSV(req, res));

// 7. Telegram Alerts
apiRouter.post("/connectors/telegram/test", (req, res) => connectorsCtrl.testTelegram(req, res));
apiRouter.post("/connectors/telegram/send-alert", (req, res) => connectorsCtrl.sendTelegramAlert(req, res));

// 8. AI Marketing Copywriter
apiRouter.post("/ai/generate-copy", (req, res) => connectorsCtrl.generateAICopy(req, res));

// 9. Customer Orders & 1688 Sourcing Assistant
apiRouter.get("/orders", (req, res) => ordersCtrl.listOrders(req, res));
apiRouter.get("/orders/:id", (req, res) => ordersCtrl.getOrderById(req, res));
apiRouter.post("/orders/webhook", (req, res) => ordersCtrl.createOrderWebhook(req, res));
apiRouter.patch("/orders/:id/status", (req, res) => ordersCtrl.updateOrderStatus(req, res));
apiRouter.delete("/orders/:id", (req, res) => ordersCtrl.deleteOrder(req, res));

