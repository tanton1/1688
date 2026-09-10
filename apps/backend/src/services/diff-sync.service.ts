import {
  WebProduct,
  Raw1688Product,
  ProductDiffSummary,
  DiffFieldChange
} from "@hub1688/shared-types";
import { SkuMappingService } from "./sku-mapping.service.js";
import { PricingEngineService } from "./pricing.service.js";

export class DiffSyncService {
  private skuMappingService = new SkuMappingService();
  private pricingService = new PricingEngineService();

  /**
   * So sánh và phân tích biến động giữa sản phẩm Web và dữ liệu mới nhất từ 1688
   */
  public detectDifferences(
    currentProduct: WebProduct,
    latestRaw1688: Raw1688Product
  ): ProductDiffSummary {
    const changes: DiffFieldChange[] = [];

    // 1. Kiểm tra biến động giá nguồn min CNY
    const sourceSnapshots = currentProduct.variants.map(variant => variant.sourcePrice).filter((value): value is number => typeof value === "number" && value > 0);
    const oldAvgCostCNY = sourceSnapshots.length ? Math.min(...sourceSnapshots) : 0;
    const newMinCostCNY = latestRaw1688.prices.minPriceCNY;
    
    let hasPriceChange = false;
    if (oldAvgCostCNY > 0 && Math.abs(newMinCostCNY - oldAvgCostCNY) > 0.05) {
      hasPriceChange = true;
      const deltaPercent = Math.round(((newMinCostCNY - oldAvgCostCNY) / oldAvgCostCNY) * 10000) / 100;
      
      let severity: "INFO" | "WARNING" | "CRITICAL" = "INFO";
      let autoApplied = false;

      if (Math.abs(deltaPercent) < 3) {
        severity = "INFO";
        autoApplied = currentProduct.isPriceAutoSync;
      } else if (Math.abs(deltaPercent) <= 7) {
        severity = "WARNING";
        autoApplied = false; // Đưa vào Queue Review
      } else {
        severity = "CRITICAL";
        autoApplied = false; // Báo động admin
      }

      changes.push({
        fieldName: "price",
        oldValue: oldAvgCostCNY,
        newValue: newMinCostCNY,
        deltaPercent,
        severity,
        autoApplied
      });
    }

    // 2. Kiểm tra tồn kho tổng
    const oldTotalStock = currentProduct.variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
    const newTotalStock = Object.values(latestRaw1688.skuMap).reduce((sum, s) => sum + (s.stock || 0), 0);

    let hasStockChange = false;
    if (oldTotalStock !== newTotalStock) {
      hasStockChange = true;
      changes.push({
        fieldName: "stock",
        oldValue: oldTotalStock,
        newValue: newTotalStock,
        deltaPercent: oldTotalStock > 0 ? Math.round(((newTotalStock - oldTotalStock) / oldTotalStock) * 100) : 100,
        severity: newTotalStock === 0 ? "CRITICAL" : "INFO",
        autoApplied: currentProduct.isStockAutoSync
      });
    }

    // 3. Kiểm tra các SKU bị nhà cung cấp gỡ
    const latestSkuIds = new Set(Object.values(latestRaw1688.skuMap).map(s => s.skuId));
    const missingSkus = currentProduct.variants.filter(v => !latestSkuIds.has(v.sourceSkuId));
    let hasUnavailableSku = false;

    if (missingSkus.length > 0) {
      hasUnavailableSku = true;
      changes.push({
        fieldName: "variants",
        oldValue: `${currentProduct.variants.length} SKU hoạt động`,
        newValue: `${missingSkus.length} SKU đã bị shop 1688 gỡ`,
        severity: "WARNING",
        autoApplied: true // Chuyển status = SOURCE_UNAVAILABLE
      });
    }

    const requiresReview = changes.some(c => c.severity === "WARNING" || c.severity === "CRITICAL");

    return {
      sourceProductId: latestRaw1688.offerId,
      webProductId: currentProduct.id || "",
      productTitle: currentProduct.titleVI,
      changes,
      hasPriceChange,
      hasStockChange,
      hasUnavailableSku,
      requiresReview,
      detectedAt: new Date().toISOString()
    };
  }
}
