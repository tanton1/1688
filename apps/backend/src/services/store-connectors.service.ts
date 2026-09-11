/**
 * Store Connectors Service
 * Xử lý đồng bộ 1-click lên WooCommerce REST API, Shopify REST Admin API và xuất CSV Shopee / TikTok Shop
 */

import {
  WebProduct,
  WooCommerceConfig,
  ShopifyConfig,
  StoreSyncResult
} from "@hub1688/shared-types";
import {
  buildWooCommercePayload,
  buildShopifyPayload,
  buildMarketplaceCSV,
  buildShopifyCSV,
  buildWooCommerceCSV,
  buildHaravanCSV
} from "@hub1688/shared-utils";
import { supabaseService } from "./supabase.service.js";
import { inMemoryProducts } from "../controllers/import.controller.js";
import { assertSafePublicUrl, assertShopifyDomain, safeFetch } from "../utils/safe-network.js";

export class StoreConnectorsService {
  /**
   * Đồng bộ sản phẩm sang WooCommerce REST API v3
   */
  public async syncToWooCommerce(
    product: WebProduct,
    config: WooCommerceConfig
  ): Promise<StoreSyncResult> {
    const startedAt = new Date().toISOString();
    const rawUrl = config.siteUrl || config.storeUrl || "";
    const cleanUrl = rawUrl.replace(/\/+$/, "");
    const productId = product.id || "";

    try {
      await assertSafePublicUrl(cleanUrl);
      const payload = buildWooCommercePayload(product, config);

      // Basic Auth Header
      const authHeader = `Basic ${Buffer.from(
        `${config.consumerKey}:${config.consumerSecret}`
      ).toString("base64")}`;

      // 1. Tạo sản phẩm chính (Parent Variable / Simple Product)
      const parentRes = await safeFetch(`${cleanUrl}/wp-json/wc/v3/products`, {
        maxBytes: 2 * 1024 * 1024,
        allowedContentTypes: ["application/json"],
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader
        },
        body: JSON.stringify(payload)
      });

      const parentData = await parentRes.json() as any;

      if (!parentRes.ok || !parentData?.id) {
        const errMsg = parentData?.message || parentData?.code || `HTTP ${parentRes.status}`;
        const failResult: StoreSyncResult = {
          connectorType: "WOOCOMMERCE",
          status: "FAILED",
          message: `Lỗi tạo sản phẩm cha trên WooCommerce: ${errMsg}`,
          errorMessage: `Lỗi tạo sản phẩm cha trên WooCommerce: ${errMsg}`,
          syncedAt: startedAt
        };
        await this.recordSyncHistory(productId, failResult);
        return failResult;
      }

      const externalProductId = String(parentData.id);
      const externalUrl = parentData.permalink || `${cleanUrl}/?p=${externalProductId}`;

      const successResult: StoreSyncResult = {
        connectorType: "WOOCOMMERCE",
        status: "SUCCESS",
        remoteId: externalProductId,
        externalProductId,
        remoteUrl: externalUrl,
        externalUrl,
        syncedAt: startedAt
      };

      await this.recordSyncHistory(productId, successResult);
      return successResult;
    } catch (err: any) {
      const failResult: StoreSyncResult = {
        connectorType: "WOOCOMMERCE",
        status: "FAILED",
        message: err.message || "Lỗi mạng kết nối tới WooCommerce",
        errorMessage: err.message || "Lỗi mạng kết nối tới WooCommerce",
        syncedAt: startedAt
      };
      await this.recordSyncHistory(productId, failResult);
      return failResult;
    }
  }

  /**
   * Đồng bộ sản phẩm sang Shopify REST Admin API
   */
  public async syncToShopify(
    product: WebProduct,
    config: ShopifyConfig
  ): Promise<StoreSyncResult> {
    const startedAt = new Date().toISOString();
    let cleanDomain = "";
    const apiVersion = config.apiVersion || "2024-01";
    const productId = product.id || "";

    try {
      cleanDomain = assertShopifyDomain(config.shopDomain);
      const payload = buildShopifyPayload(product, config);

      const res = await safeFetch(`https://${cleanDomain}/admin/api/${apiVersion}/products.json`, {
        maxBytes: 2 * 1024 * 1024,
        allowedContentTypes: ["application/json"],
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": config.accessToken
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json() as any;

      if (!res.ok || !data?.product?.id) {
        const errors = data?.errors ? JSON.stringify(data.errors) : `HTTP ${res.status}`;
        const failResult: StoreSyncResult = {
          connectorType: "SHOPIFY",
          status: "FAILED",
          message: `Lỗi đẩy sản phẩm lên Shopify: ${errors}`,
          errorMessage: `Lỗi đẩy sản phẩm lên Shopify: ${errors}`,
          syncedAt: startedAt
        };
        await this.recordSyncHistory(productId, failResult);
        return failResult;
      }

      const externalProductId = String(data.product.id);
      const externalUrl = `https://${cleanDomain}/admin/products/${externalProductId}`;

      const successResult: StoreSyncResult = {
        connectorType: "SHOPIFY",
        status: "SUCCESS",
        remoteId: externalProductId,
        externalProductId,
        remoteUrl: externalUrl,
        externalUrl,
        syncedAt: startedAt
      };

      await this.recordSyncHistory(productId, successResult);
      return successResult;
    } catch (err: any) {
      const failResult: StoreSyncResult = {
        connectorType: "SHOPIFY",
        status: "FAILED",
        message: err.message || "Lỗi mạng kết nối tới Shopify API",
        errorMessage: err.message || "Lỗi mạng kết nối tới Shopify API",
        syncedAt: startedAt
      };
      await this.recordSyncHistory(productId, failResult);
      return failResult;
    }
  }

  /**
   * Xuất danh sách sản phẩm thành file CSV chuẩn sàn TMĐT (Shopee, TikTok Shop, Shopify, WooCommerce, Haravan)
   */
  public exportCSV(
    products: WebProduct[],
    platform: "SHOPEE" | "TIKTOK_SHOP" | "SHOPIFY" | "WOOCOMMERCE" | "HARAVAN",
    shopifyConfig?: Pick<ShopifyConfig, "currency" | "exchangeRateVNDToUSD">
  ): string {
    switch (platform) {
      case "SHOPIFY":
        return buildShopifyCSV(products, shopifyConfig || { currency: "VND" });
      case "WOOCOMMERCE":
        return buildWooCommerceCSV(products);
      case "HARAVAN":
        return buildHaravanCSV(products);
      case "TIKTOK_SHOP":
        return buildMarketplaceCSV(products, "TIKTOK_SHOP");
      case "SHOPEE":
      default:
        return buildMarketplaceCSV(products, "SHOPEE");
    }
  }

  /**
   * Lưu lịch sử đồng bộ vào bộ nhớ và Supabase
   */
  private async recordSyncHistory(productId: string, result: StoreSyncResult): Promise<void> {
    if (!productId) return;
    const product = inMemoryProducts.get(productId);
    if (product) {
      if (!product.storeSyncHistory) product.storeSyncHistory = [];
      product.storeSyncHistory.unshift(result);
      if (product.storeSyncHistory.length > 20) {
        product.storeSyncHistory = product.storeSyncHistory.slice(0, 20);
      }
      product.updatedAt = new Date().toISOString();
      inMemoryProducts.set(productId, product);

      if (supabaseService.isConfigured()) {
        try {
          await supabaseService.updateWebProduct(productId, {
            storeSyncHistory: product.storeSyncHistory
          });
        } catch (dbErr) {
          console.error("[RecordSyncHistory DB Error]", dbErr);
        }
      }
    }
  }
}

export const storeConnectorsService = new StoreConnectorsService();
