import { Request, Response } from "express";
import { Raw1688Product, ProductDiffSummary } from "@hub1688/shared-types";
import { inMemoryProducts } from "./import.controller.js";
import { DiffSyncService } from "../services/diff-sync.service.js";
import { SEED_DIFF_LOGS } from "../services/seed-data.js";
import { ENV } from "../config/env.js";
import { PricingEngineService } from "../services/pricing.service.js";
import { supabaseService } from "../services/supabase.service.js";
import { shopeeConnectorService } from "../services/shopee-connector.service.js";

const diffSyncService = new DiffSyncService();
const pricingService = new PricingEngineService();
const inMemoryDiffLogs: ProductDiffSummary[] = ENV.DEMO_MODE ? [...SEED_DIFF_LOGS.map(l => ({ ...l }))] : [];
const pendingSnapshots = new Map<string, Raw1688Product>();

export class SyncController {
  /**
   * Kích hoạt kiểm tra so sánh khác biệt (Diff Check) giữa web và 1688
   */
  public async triggerCheck(req: Request, res: Response): Promise<void> {
    const { rawLatestProduct } = req.body as { rawLatestProduct: Raw1688Product };

    if (!rawLatestProduct?.offerId) {
      res.status(400).json({ error: "Missing rawLatestProduct data" });
      return;
    }

    const currentProduct = supabaseService.isConfigured()
      ? await supabaseService.getProductBySourceId(rawLatestProduct.offerId)
      : Array.from(inMemoryProducts.values()).find(p => p.sourceProductId === rawLatestProduct.offerId);

    if (!currentProduct) {
      res.status(404).json({ error: "Sản phẩm nguồn chưa được import về web" });
      return;
    }

    const diffSummary = diffSyncService.detectDifferences(currentProduct, rawLatestProduct);
    if (diffSummary.changes.length > 0) {
      if (supabaseService.isConfigured() && !(await supabaseService.saveDiffLog(diffSummary, rawLatestProduct))) {
        res.status(503).json({ error: "PERSISTENCE_FAILED" });
        return;
      }
      inMemoryDiffLogs.push(diffSummary);
      pendingSnapshots.set(diffSummary.webProductId, rawLatestProduct);
    }

    res.json({
      success: true,
      hasChanges: diffSummary.changes.length > 0,
      diffSummary
    });
  }

  /**
   * Lấy danh sách biến thể / giá chờ duyệt
   */
  public async getDiffLogs(req: Request, res: Response): Promise<void> {
    if (supabaseService.isConfigured()) {
      const persisted = await supabaseService.listPendingDiffLogs();
      if (!persisted) {
        res.status(503).json({ error: "PERSISTENCE_FAILED" });
        return;
      }
      inMemoryDiffLogs.splice(0, inMemoryDiffLogs.length, ...persisted.map(item => item.summary));
      pendingSnapshots.clear();
      for (const item of persisted) pendingSnapshots.set(item.summary.webProductId, item.snapshot);
    }
    res.json({ logs: inMemoryDiffLogs });
  }

  /**
   * Áp dụng hoặc bỏ qua một biến động
   */
  public async resolveDiff(req: Request, res: Response): Promise<void> {
    const { webProductId, action } = req.body as { webProductId: string; action: "APPLY" | "IGNORE" };
    const product = supabaseService.isConfigured()
      ? await supabaseService.getProductById(webProductId)
      : inMemoryProducts.get(webProductId);

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const index = inMemoryDiffLogs.findIndex(l => l.webProductId === webProductId);
    if (index < 0) {
      res.status(404).json({ error: "DIFF_NOT_FOUND" });
      return;
    }

    if (action === "APPLY") {
      const snapshot = pendingSnapshots.get(webProductId);
      if (!snapshot) {
        res.status(409).json({ error: "DIFF_SNAPSHOT_MISSING", message: "Không còn snapshot nguồn để áp dụng an toàn" });
        return;
      }
      const bySku = new Map(Object.values(snapshot.skuMap).map(item => [item.skuId, item]));
      const updatedProduct = { ...product, variants: product.variants.map(variant => {
        const source = bySku.get(variant.sourceSkuId);
        if (!source) return { ...variant, sourceAvailable: false, stockQuantity: 0 };
        const priced = pricingService.calculate(source.priceCNY);
        return {
          ...variant,
          sourcePrice: source.priceCNY,
          costPriceVND: priced.totalCostVND,
          sellingPriceVND: priced.finalSellingPriceVND,
          stockQuantity: source.stock ?? 0,
          sourceAvailable: source.available ?? ((source.inventoryTracked ?? true) && (source.stock ?? 0) > 0),
          inventoryTracked: source.inventoryTracked ?? true
        };
      }) };
      const prices = updatedProduct.variants.map(variant => variant.sellingPriceVND);
      updatedProduct.minPriceVND = prices.length ? Math.min(...prices) : 0;
      updatedProduct.maxPriceVND = prices.length ? Math.max(...prices) : 0;
      updatedProduct.updatedAt = new Date().toISOString();
      if (supabaseService.isConfigured()) {
        const persisted = await supabaseService.updateWebProduct(webProductId, updatedProduct);
        if (!persisted) {
          res.status(503).json({ error: "PERSISTENCE_FAILED" });
          return;
        }
      }
      inMemoryProducts.set(webProductId, updatedProduct);
    }

    if (supabaseService.isConfigured() && !(await supabaseService.resolveDiffLog(webProductId, action === "APPLY" ? "APPLIED" : "IGNORED"))) {
      res.status(503).json({ error: "PERSISTENCE_FAILED" });
      return;
    }

    inMemoryDiffLogs.splice(index, 1);
    pendingSnapshots.delete(webProductId);

    res.json({ success: true, message: `Đã ${action === "APPLY" ? "áp dụng" : "bỏ qua"} thay đổi cho sản phẩm` });
  }

  /**
   * Background Cron Worker - Tự động quét và cảnh báo biến động giá/tồn kho
   */
  public async runCronSync(req: Request, res: Response): Promise<void> {
    const shopee = await shopeeConnectorService.syncInventory(undefined, 10);
    res.status(shopee.success ? 200 : 207).json({
      success: shopee.success,
      message: shopee.processed
        ? `Đã kiểm tra ${shopee.processed} listing Shopee`
        : "Không có listing Shopee đến lịch đồng bộ",
      shopee
    });
  }
}
