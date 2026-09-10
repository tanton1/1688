import { Request, Response } from "express";
import { Raw1688Product, ProductDiffSummary } from "@hub1688/shared-types";
import { inMemoryProducts } from "./import.controller.js";
import { DiffSyncService } from "../services/diff-sync.service.js";
import { SEED_DIFF_LOGS } from "../services/seed-data.js";
import { ENV } from "../config/env.js";
import { PricingEngineService } from "../services/pricing.service.js";
import { supabaseService } from "../services/supabase.service.js";

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

    const currentProduct = Array.from(inMemoryProducts.values()).find(
      p => p.sourceProductId === rawLatestProduct.offerId
    );

    if (!currentProduct) {
      res.status(404).json({ error: "Sản phẩm nguồn chưa được import về web" });
      return;
    }

    const diffSummary = diffSyncService.detectDifferences(currentProduct, rawLatestProduct);
    if (diffSummary.changes.length > 0) {
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
    res.json({ logs: inMemoryDiffLogs });
  }

  /**
   * Áp dụng hoặc bỏ qua một biến động
   */
  public async resolveDiff(req: Request, res: Response): Promise<void> {
    const { webProductId, action } = req.body as { webProductId: string; action: "APPLY" | "IGNORE" };
    const product = inMemoryProducts.get(webProductId);

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
      product.variants = product.variants.map(variant => {
        const source = bySku.get(variant.sourceSkuId);
        if (!source) return { ...variant, sourceAvailable: false, stockQuantity: 0 };
        const priced = pricingService.calculate(source.priceCNY);
        return {
          ...variant,
          sourcePrice: source.priceCNY,
          costPriceVND: priced.totalCostVND,
          sellingPriceVND: priced.finalSellingPriceVND,
          stockQuantity: source.stock ?? 0,
          sourceAvailable: (source.stock ?? 0) > 0
        };
      });
      product.minPriceVND = Math.min(...product.variants.map(variant => variant.sellingPriceVND));
      product.maxPriceVND = Math.max(...product.variants.map(variant => variant.sellingPriceVND));
      product.updatedAt = new Date().toISOString();
      if (supabaseService.isConfigured()) {
        const persisted = await supabaseService.updateWebProduct(webProductId, product);
        if (!persisted) {
          res.status(503).json({ error: "PERSISTENCE_FAILED" });
          return;
        }
      }
      inMemoryProducts.set(webProductId, product);
    }

    inMemoryDiffLogs.splice(index, 1);
    pendingSnapshots.delete(webProductId);

    res.json({ success: true, message: `Đã ${action === "APPLY" ? "áp dụng" : "bỏ qua"} thay đổi cho sản phẩm` });
  }

  /**
   * Background Cron Worker - Tự động quét và cảnh báo biến động giá/tồn kho
   */
  public async runCronSync(req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      error: "NOT_IMPLEMENTED",
      message: "Cron chưa có crawler nguồn xác thực; không có lượt kiểm tra nào được ghi nhận"
    });
  }
}
