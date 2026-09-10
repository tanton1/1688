import { Request, Response } from "express";
import { multiPlatformClonerService } from "../services/multi-platform-cloner.service.js";
import { CloneExecuteRequest } from "@hub1688/shared-types";

export class CloneController {
  /**
   * Lấy danh sách các nền tảng hỗ trợ clone kèm metadata & URL mẫu
   */
  public async getSupportedPlatforms(_req: Request, res: Response): Promise<void> {
    try {
      const platforms = multiPlatformClonerService.getSupportedPlatforms();
      res.json({ success: true, platforms });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Phân tích và xem trước (Preview) sản phẩm từ URL dán vào
   */
  public async preview(req: Request, res: Response): Promise<void> {
    try {
      const { url, platform } = req.body as { url: string; platform?: any };
      if (!url) {
        res.status(400).json({ success: false, error: "Vui lòng nhập đường dẫn URL sản phẩm cần clone" });
        return;
      }

      const preview = await multiPlatformClonerService.previewProduct(url, platform);
      res.json({ success: true, preview });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Lỗi phân tích URL sản phẩm" });
    }
  }

  /**
   * Thực hiện clone chính thức và lưu sản phẩm vào hệ thống
   */
  public async execute(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body as CloneExecuteRequest;
      if (!payload?.url) {
        res.status(400).json({ success: false, error: "Vui lòng cung cấp URL sản phẩm hợp lệ" });
        return;
      }

      const product = await multiPlatformClonerService.executeClone(payload);
      res.json({
        success: true,
        message: `Đã clone thành công sản phẩm từ ${product.sourcePlatform || "Website"} vào kho hàng`,
        product
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Lỗi thực hiện clone sản phẩm" });
    }
  }

  /**
   * Clone hàng loạt danh sách URLs (Batch Queue processing)
   */
  public async batchClone(req: Request, res: Response): Promise<void> {
    try {
      const { urls, pricingRuleId, categoryName, autoPublish } = req.body;
      if (!Array.isArray(urls) || urls.length === 0) {
        res.status(400).json({ success: false, error: "Vui lòng cung cấp danh sách URLs hợp lệ" });
        return;
      }

      const result = await multiPlatformClonerService.executeBatchClone({
        urls,
        pricingRuleId,
        categoryName,
        autoPublish
      });

      res.json({
        success: true,
        message: `Đã xử lý xong ${result.total} sản phẩm (Thành công: ${result.succeeded}, Lỗi: ${result.failed})`,
        ...result
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Lỗi xử lý batch clone" });
    }
  }

  /**
   * Tìm kiếm xưởng 1688 bằng hình ảnh từ sản phẩm Shopee/TikTok/Web (Visual Sourcing)
   */
  public async visualSourcing(req: Request, res: Response): Promise<void> {
    try {
      const result = await multiPlatformClonerService.find1688SuppliersByImage(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Lỗi tìm kiếm nguồn xưởng 1688" });
    }
  }
}

export const cloneController = new CloneController();

