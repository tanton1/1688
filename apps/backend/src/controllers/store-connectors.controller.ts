import { Request, Response } from "express";
import {
  WooCommerceConfig,
  ShopifyConfig,
  AICopywritingStyle,
  WebProduct
} from "@hub1688/shared-types";
import { generateAICopywriting } from "@hub1688/shared-utils";
import { storeConnectorsService } from "../services/store-connectors.service.js";
import { telegramAlertService } from "../services/telegram-alert.service.js";
import { supabaseService } from "../services/supabase.service.js";
import { aiGatewayService } from "../services/ai-gateway.service.js";
import { inMemoryProducts } from "./import.controller.js";

export class StoreConnectorsController {
  /**
   * Helper tìm sản phẩm theo ID từ cache hoặc Supabase
   */
  private async findProduct(id: string): Promise<WebProduct | null> {
    const memory = inMemoryProducts.get(id);
    if (memory) return memory;

    if (supabaseService.isConfigured()) {
      try {
        const fromDb = await supabaseService.getProductById(id);
        if (fromDb) {
          inMemoryProducts.set(id, fromDb);
          return fromDb;
        }
      } catch (err) {
        console.error("[findProduct Supabase error]", err);
      }
    }
    return null;
  }

  /**
   * Đồng bộ sang WooCommerce REST API
   */
  public async syncWooCommerce(req: Request, res: Response): Promise<void> {
    const { productId, config } = req.body as {
      productId: string;
      config: WooCommerceConfig;
    };

    if (!productId || !config?.siteUrl || !config?.consumerKey || !config?.consumerSecret) {
      res.status(400).json({
        error: "Yêu cầu đầy đủ productId, siteUrl, consumerKey và consumerSecret"
      });
      return;
    }

    const product = await this.findProduct(productId);
    if (!product) {
      res.status(404).json({ error: "Không tìm thấy sản phẩm" });
      return;
    }

    const result = await storeConnectorsService.syncToWooCommerce(product, config);
    res.json({
      success: result.status === "SUCCESS",
      result
    });
  }

  /**
   * Đồng bộ sang Shopify REST Admin API
   */
  public async syncShopify(req: Request, res: Response): Promise<void> {
    const { productId, config } = req.body as {
      productId: string;
      config: ShopifyConfig;
    };

    if (!productId || !config?.shopDomain || !config?.accessToken) {
      res.status(400).json({
        error: "Yêu cầu đầy đủ productId, shopDomain và accessToken"
      });
      return;
    }

    const product = await this.findProduct(productId);
    if (!product) {
      res.status(404).json({ error: "Không tìm thấy sản phẩm" });
      return;
    }

    const result = await storeConnectorsService.syncToShopify(product, config);
    res.json({
      success: result.status === "SUCCESS",
      result
    });
  }

  /**
   * Xuất file CSV chuẩn sàn TMĐT (Shopee, TikTok Shop, Shopify, WooCommerce, Haravan)
   */
  public async exportMarketplaceCSV(req: Request, res: Response): Promise<void> {
    const { productIds, platform } = req.body as {
      productIds: string[];
      platform: "SHOPEE" | "TIKTOK_SHOP" | "SHOPIFY" | "WOOCOMMERCE" | "HARAVAN";
    };

    if (!Array.isArray(productIds) || productIds.length === 0) {
      res.status(400).json({ error: "productIds phải là mảng không rỗng" });
      return;
    }

    const products: WebProduct[] = [];
    for (const id of productIds) {
      const p = await this.findProduct(id);
      if (p) products.push(p);
    }

    if (products.length === 0) {
      res.status(404).json({ error: "Không tìm thấy sản phẩm nào hợp lệ để xuất CSV" });
      return;
    }

    const targetPlatform = platform || "SHOPEE";
    const csvContent = storeConnectorsService.exportCSV(products, targetPlatform);

    const filename = `${targetPlatform.toLowerCase()}_products_export_${Date.now()}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csvContent);
  }

  /**
   * Kiểm tra kết nối Telegram Bot
   */
  public async testTelegram(req: Request, res: Response): Promise<void> {
    const { botToken, chatId } = req.body as { botToken: string; chatId: string };

    if (!botToken || !chatId) {
      res.status(400).json({ error: "botToken và chatId là bắt buộc" });
      return;
    }

    const testRes = await telegramAlertService.testConnection(botToken, chatId);
    res.json(testRes);
  }

  /**
   * Gửi cảnh báo thủ công hoặc kích hoạt test biến động giá / hết hàng
   */
  public async sendTelegramAlert(req: Request, res: Response): Promise<void> {
    const { botToken, chatId, type, data } = req.body as {
      botToken: string;
      chatId: string;
      type: "PRICE_CHANGE" | "STOCK" | "CUSTOM";
      data: any;
    };

    if (!botToken || !chatId) {
      res.status(400).json({ error: "botToken và chatId là bắt buộc" });
      return;
    }

    if (type === "PRICE_CHANGE") {
      const result = await telegramAlertService.sendPriceChangeAlert({
        botToken,
        chatId,
        productTitle: data.productTitle || "Sản phẩm thử nghiệm",
        skuCode: data.skuCode || "TEST-01",
        oldPriceCNY: Number(data.oldPriceCNY) || 20,
        newPriceCNY: Number(data.newPriceCNY) || 25,
        oldPriceVND: Number(data.oldPriceVND) || 85000,
        newPriceVND: Number(data.newPriceVND) || 105000,
        sourceUrl: data.sourceUrl
      });
      res.json(result);
      return;
    }

    if (type === "STOCK") {
      const result = await telegramAlertService.sendStockAlert({
        botToken,
        chatId,
        productTitle: data.productTitle || "Sản phẩm thử nghiệm",
        skuCode: data.skuCode || "TEST-01",
        variantName: data.variantName || "Màu Đen - Size L",
        remainingStock: Number(data.remainingStock) || 0,
        sourceUrl: data.sourceUrl
      });
      res.json(result);
      return;
    }

    // Custom text message
    const result = await telegramAlertService.sendMessage(
      botToken,
      chatId,
      data.message || "🔔 Cảnh báo từ 1688 Listing Sync Hub"
    );
    res.json(result);
  }

  /**
   * Tạo bài viết bán hàng AI Copywriting (AIDA, PAS, Storytelling, Social Ads) bằng ChatGPT/Gemini
   */
  public async generateAICopy(req: Request, res: Response): Promise<void> {
    const { productId, style, language, apiKey, model } = req.body as {
      productId: string;
      style?: AICopywritingStyle;
      language?: "VI" | "EN";
      apiKey?: string;
      model?: string;
    };

    if (!productId) {
      res.status(400).json({ error: "productId là bắt buộc" });
      return;
    }

    const product = await this.findProduct(productId);
    if (!product) {
      res.status(404).json({ error: "Không tìm thấy sản phẩm" });
      return;
    }

    const headerKey = req.headers["x-ai-api-key"] as string | undefined;
    const headerModel = req.headers["x-ai-model"] as string | undefined;

    const copyResult = await aiGatewayService.generateEcommerceCopy({
      product,
      style: style || "AIDA",
      language: language || "VI",
      apiKey: apiKey || headerKey,
      model: model || headerModel
    });

    res.json({
      success: true,
      productId: product.id,
      style: style || "AIDA",
      language: language || "VI",
      copy: copyResult
    });
  }

  /**
   * Dịch chữ tiếng Trung trên hình ảnh sản phẩm bằng AI Vision (ChatGPT/Gemini OCR)
   */
  public async translateImage(req: Request, res: Response): Promise<void> {
    const { imageUrl, apiKey, model } = req.body as {
      imageUrl: string;
      apiKey?: string;
      model?: string;
    };

    if (!imageUrl) {
      res.status(400).json({ error: "imageUrl là bắt buộc" });
      return;
    }

    const headerKey = req.headers["x-ai-api-key"] as string | undefined;
    const headerModel = req.headers["x-ai-model"] as string | undefined;

    const result = await aiGatewayService.translateImageChineseText({
      imageUrl,
      apiKey: apiKey || headerKey,
      model: model || headerModel
    });

    res.json(result);
  }

  /**
   * Lấy cấu hình AI hiện tại từ Backend (đã ẩn key an toàn)
   */
  public getAiConfig(req: Request, res: Response): void {
    const config = aiGatewayService.getMaskedConfig();
    res.json(config);
  }

  /**
   * Lưu cấu hình AI Key & Model trực tiếp vào Backend (không lộ ra client)
   */
  public updateAiConfig(req: Request, res: Response): void {
    res.status(405).json({
      error: "RUNTIME_AI_CONFIG_DISABLED",
      message: "Cấu hình AI chỉ được quản lý bằng biến môi trường trên máy chủ"
    });
  }

  /**
   * Xóa chữ / tem mác tiếng Trung trên ảnh sản phẩm (AI Inpainting / Text Eraser)
   */
  public async inpaintImage(req: Request, res: Response): Promise<void> {
    const { imageUrl, maskDataUrl, rectangles } = req.body as {
      imageUrl?: string;
      maskDataUrl?: string;
      rectangles?: Array<{ x: number; y: number; width: number; height: number }>;
    };

    if (!imageUrl) {
      res.status(400).json({ success: false, error: "imageUrl là bắt buộc" });
      return;
    }

    const result = await aiGatewayService.inpaintImage({
      imageUrl,
      maskDataUrl,
      rectangles
    });

    res.json(result);
  }
}
