import { Request, Response } from "express";
import {
  WooCommerceConfig,
  ShopifyConfig,
  AICopywritingStyle,
  AITemplateDraftRequest,
  WebProduct
} from "@hub1688/shared-types";
import { storeConnectorsService } from "../services/store-connectors.service.js";
import { telegramAlertService } from "../services/telegram-alert.service.js";
import { supabaseService } from "../services/supabase.service.js";
import { AiGatewayError, aiGatewayService } from "../services/ai-gateway.service.js";
import { inMemoryProducts } from "./import.controller.js";
import { ENV } from "../config/env.js";

export class StoreConnectorsController {
  private sendAiError(res: Response, error: unknown): void {
    if (error instanceof AiGatewayError) {
      const status = error.code === "AI_NOT_CONFIGURED" ? 503 : error.code === "AI_MODEL_NOT_SUPPORTED" ? 400 : 502;
      const message = error.code === "AI_NOT_CONFIGURED"
        ? "Dịch vụ AI chưa được cấu hình trên máy chủ"
        : error.code === "AI_MODEL_NOT_SUPPORTED"
          ? "Mô hình AI không nằm trong danh sách được máy chủ hỗ trợ"
          : "Nhà cung cấp AI không thể xử lý yêu cầu";
      res.status(status).json({ success: false, error: error.code, message });
      return;
    }

    console.error("[StoreConnectorsController] unexpected AI error");
    res.status(500).json({ success: false, error: "INTERNAL_ERROR" });
  }

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
    const { productId } = req.body as { productId: string };
    const config: WooCommerceConfig = {
      storeUrl: ENV.WOOCOMMERCE_STORE_URL,
      siteUrl: ENV.WOOCOMMERCE_STORE_URL,
      consumerKey: ENV.WOOCOMMERCE_CONSUMER_KEY,
      consumerSecret: ENV.WOOCOMMERCE_CONSUMER_SECRET
    };

    const product = await this.findProduct(productId);
    if (!product) {
      res.status(404).json({ error: "Không tìm thấy sản phẩm" });
      return;
    }
    if (product.status !== "PUBLISHED") {
      res.status(409).json({
        error: "PRODUCT_NOT_PUBLISHED",
        message: "Chỉ có thể đồng bộ sản phẩm đã vượt qua bước duyệt và được xuất bản"
      });
      return;
    }
    if (!config.siteUrl || !config.consumerKey || !config.consumerSecret) {
      res.status(503).json({
        error: "WOOCOMMERCE_NOT_CONFIGURED"
      });
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
    const { productId } = req.body as { productId: string };
    const config: ShopifyConfig = {
      shopDomain: ENV.SHOPIFY_SHOP_DOMAIN,
      accessToken: ENV.SHOPIFY_ACCESS_TOKEN,
      apiVersion: ENV.SHOPIFY_API_VERSION,
      currency: ENV.SHOPIFY_STORE_CURRENCY,
      exchangeRateVNDToUSD: ENV.SHOPIFY_VND_PER_USD
    };

    const product = await this.findProduct(productId);
    if (!product) {
      res.status(404).json({ error: "Không tìm thấy sản phẩm" });
      return;
    }
    if (product.status !== "PUBLISHED") {
      res.status(409).json({
        error: "PRODUCT_NOT_PUBLISHED",
        message: "Chỉ có thể đồng bộ sản phẩm đã vượt qua bước duyệt và được xuất bản"
      });
      return;
    }
    if (!config.shopDomain || !config.accessToken) {
      res.status(503).json({
        error: "SHOPIFY_NOT_CONFIGURED"
      });
      return;
    }
    if (config.currency === "USD" && (!config.exchangeRateVNDToUSD || config.exchangeRateVNDToUSD <= 0)) {
      res.status(503).json({ error: "SHOPIFY_EXCHANGE_RATE_REQUIRED" });
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
    const missingProductIds: string[] = [];
    for (const id of productIds) {
      const p = await this.findProduct(id);
      if (p) products.push(p);
      else missingProductIds.push(id);
    }

    if (missingProductIds.length > 0) {
      res.status(404).json({ error: "PRODUCTS_NOT_FOUND", productIds: missingProductIds });
      return;
    }
    const unpublishedProductIds = products.filter(product => product.status !== "PUBLISHED").map(product => product.id);
    if (unpublishedProductIds.length > 0) {
      res.status(409).json({
        error: "PRODUCT_NOT_PUBLISHED",
        message: "Chỉ có thể xuất sản phẩm đã vượt qua bước duyệt và được xuất bản",
        productIds: unpublishedProductIds
      });
      return;
    }

    const targetPlatform = platform || "SHOPEE";
    let csvContent: string;
    try {
      csvContent = storeConnectorsService.exportCSV(products, targetPlatform, {
        currency: ENV.SHOPIFY_STORE_CURRENCY,
        exchangeRateVNDToUSD: ENV.SHOPIFY_VND_PER_USD
      });
    } catch (error) {
      if (error instanceof Error && error.message === "SHOPIFY_EXCHANGE_RATE_REQUIRED") {
        res.status(503).json({ error: "SHOPIFY_EXCHANGE_RATE_REQUIRED" });
        return;
      }
      console.error("[CSV export]", error);
      res.status(500).json({ error: "CSV_EXPORT_FAILED" });
      return;
    }

    const filename = `${targetPlatform.toLowerCase()}_products_export_${Date.now()}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csvContent);
  }

  /**
   * Kiểm tra kết nối Telegram Bot
   */
  public async testTelegram(req: Request, res: Response): Promise<void> {
    const botToken = ENV.TELEGRAM_BOT_TOKEN;
    const chatId = ENV.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      res.status(503).json({ error: "TELEGRAM_NOT_CONFIGURED" });
      return;
    }

    const testRes = await telegramAlertService.testConnection(botToken, chatId);
    res.json(testRes);
  }

  /**
   * Gửi cảnh báo thủ công hoặc kích hoạt test biến động giá / hết hàng
   */
  public async sendTelegramAlert(req: Request, res: Response): Promise<void> {
    const { type, data } = req.body as {
      type: "PRICE_CHANGE" | "STOCK" | "CUSTOM";
      data: any;
    };
    const botToken = ENV.TELEGRAM_BOT_TOKEN;
    const chatId = ENV.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      res.status(503).json({ error: "TELEGRAM_NOT_CONFIGURED" });
      return;
    }

    if (type === "PRICE_CHANGE") {
      const result = await telegramAlertService.sendPriceChangeAlert({
        botToken,
        chatId,
        productTitle: data.productTitle,
        skuCode: data.skuCode,
        oldPriceCNY: Number(data.oldPriceCNY),
        newPriceCNY: Number(data.newPriceCNY),
        oldPriceVND: Number(data.oldPriceVND),
        newPriceVND: Number(data.newPriceVND),
        sourceUrl: data.sourceUrl
      });
      res.json(result);
      return;
    }

    if (type === "STOCK") {
      const result = await telegramAlertService.sendStockAlert({
        botToken,
        chatId,
        productTitle: data.productTitle,
        skuCode: data.skuCode,
        variantName: data.variantName,
        remainingStock: Number(data.remainingStock),
        sourceUrl: data.sourceUrl
      });
      res.json(result);
      return;
    }

    // Custom text message
    const result = await telegramAlertService.sendMessage(
      botToken,
      chatId,
      data.message
    );
    res.json(result);
  }

  /**
   * Tạo bài viết bán hàng AI Copywriting (AIDA, PAS, Storytelling, Social Ads) bằng ChatGPT/Gemini
   */
  public async generateAICopy(req: Request, res: Response): Promise<void> {
    const { productId, style, language, focusKeyword, secondaryKeywords, tone, model } = req.body as {
      productId: string;
      style?: AICopywritingStyle;
      language?: "VI" | "EN";
      focusKeyword?: string;
      secondaryKeywords?: string[];
      tone?: "TRUSTWORTHY" | "CONVERSION" | "PREMIUM" | "FRIENDLY";
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

    const headerModel = req.header("x-ai-model") || undefined;

    try {
      const copyResult = await aiGatewayService.generateEcommerceCopy({
        product,
        style: style || "AIDA",
        language: language || "VI",
        focusKeyword,
        secondaryKeywords,
        tone,
        model: model || headerModel
      });

      res.json({
        success: true,
        productId: product.id,
        style: style || "AIDA",
        language: language || "VI",
        copy: copyResult,
        mode: ENV.DEMO_MODE && !aiGatewayService.isConfigured() ? "DEMO" : "LIVE"
      });
    } catch (error) {
      this.sendAiError(res, error);
    }
  }

  /**
   * Tạo bản nháp Content + Variation cho trình biên tập template.
   */
  public async generateTemplateDraft(req: Request, res: Response): Promise<void> {
    const payload = req.body as AITemplateDraftRequest;
    const headerModel = req.header("x-ai-model") || undefined;

    try {
      const draft = await aiGatewayService.generateTemplateDraft({
        ...payload,
        model: payload.model || headerModel
      });
      res.json({
        success: true,
        mode: ENV.DEMO_MODE && !aiGatewayService.isConfigured() ? "DEMO" : "LIVE",
        draft
      });
    } catch (error) {
      this.sendAiError(res, error);
    }
  }

  /**
   * Dịch chữ tiếng Trung trên hình ảnh sản phẩm bằng AI Vision (ChatGPT/Gemini OCR)
   */
  public async translateImage(req: Request, res: Response): Promise<void> {
    const { imageUrl, model } = req.body as {
      imageUrl: string;
      model?: string;
    };

    if (!imageUrl) {
      res.status(400).json({ error: "imageUrl là bắt buộc" });
      return;
    }

    const headerModel = req.header("x-ai-model") || undefined;

    try {
      const result = await aiGatewayService.translateImageChineseText({
        imageUrl,
        model: model || headerModel
      });

      res.json(result);
    } catch (error) {
      this.sendAiError(res, error);
    }
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
    res.status(result.success ? 200 : 501).json(result);
  }
}
