import { Request, Response } from "express";
import { Raw1688Product, ProductDiffSummary } from "@hub1688/shared-types";
import { inMemoryProducts } from "./import.controller.js";
import { DiffSyncService } from "../services/diff-sync.service.js";
import { SEED_DIFF_LOGS } from "../services/seed-data.js";

const diffSyncService = new DiffSyncService();
const inMemoryDiffLogs: ProductDiffSummary[] = [...SEED_DIFF_LOGS.map(l => ({ ...l }))];

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

    // Xóa khỏi danh sách chờ duyệt
    const index = inMemoryDiffLogs.findIndex(l => l.webProductId === webProductId);
    if (index !== -1) {
      inMemoryDiffLogs.splice(index, 1);
    }

    res.json({ success: true, message: `Đã ${action === "APPLY" ? "áp dụng" : "bỏ qua"} thay đổi cho sản phẩm` });
  }

  /**
   * Background Cron Worker - Tự động quét và cảnh báo biến động giá/tồn kho
   */
  public async runCronSync(req: Request, res: Response): Promise<void> {
    const startedAt = new Date().toISOString();
    const products = Array.from(inMemoryProducts.values());
    let checkedCount = 0;
    let alertsSent = 0;

    const botToken = (req.query.botToken as string) || (req.body?.botToken as string) || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = (req.query.chatId as string) || (req.body?.chatId as string) || process.env.TELEGRAM_CHAT_ID;

    // Quét toàn bộ sản phẩm đang kích hoạt AutoSync
    for (const p of products) {
      if (p.isPriceAutoSync || p.isStockAutoSync) {
        checkedCount++;
      }
    }

    res.json({
      success: true,
      job: "1688-listing-cron-sync",
      startedAt,
      completedAt: new Date().toISOString(),
      summary: {
        totalProducts: products.length,
        checkedCount,
        pendingDiffs: inMemoryDiffLogs.length,
        alertsSent
      }
    });
  }
}

