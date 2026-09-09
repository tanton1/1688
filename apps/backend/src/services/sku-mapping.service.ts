import {
  Raw1688Product,
  WebProductVariant,
  PricingRuleConfig
} from "@hub1688/shared-types";
import { generateCartesianCombinations } from "@hub1688/shared-utils";

export class SkuMappingService {
  /**
   * Tạo danh sách biến thể web từ dữ liệu thô 1688
   */
  public generateVariantsFromRaw(
    rawProduct: Raw1688Product,
    pricingRule: PricingRuleConfig,
    glossary: Record<string, string> = {}
  ): WebProductVariant[] {
    return generateCartesianCombinations(
      rawProduct.skuProps,
      rawProduct.skuMap,
      pricingRule,
      glossary
    );
  }

  /**
   * Đồng bộ cập nhật trạng thái khi 1688 thay đổi danh sách SKU
   */
  public reconcileVariants(
    existingVariants: WebProductVariant[],
    latestRawProduct: Raw1688Product,
    pricingRule: PricingRuleConfig,
    glossary: Record<string, string> = {}
  ): {
    updatedVariants: WebProductVariant[];
    removedSkuIds: string[];
    newVariantsCount: number;
  } {
    const latestVariants = this.generateVariantsFromRaw(latestRawProduct, pricingRule, glossary);
    const latestSkuIdMap = new Map(latestVariants.map(v => [v.sourceSkuId, v]));

    const updatedVariants: WebProductVariant[] = [];
    const removedSkuIds: string[] = [];

    // 1. Duyệt qua các variant hiện có trên web
    for (const existing of existingVariants) {
      const fresh = latestSkuIdMap.get(existing.sourceSkuId);

      if (fresh) {
        // SKU vẫn tồn tại trên 1688 -> cập nhật giá và tồn kho
        updatedVariants.push({
          ...existing,
          costPriceVND: fresh.costPriceVND,
          sellingPriceVND: existing.sellingPriceVND > 0 ? existing.sellingPriceVND : fresh.sellingPriceVND,
          stockQuantity: fresh.stockQuantity,
          sourceAvailable: fresh.stockQuantity > 0
        });
        latestSkuIdMap.delete(existing.sourceSkuId);
      } else {
        // SKU đã bị nhà cung cấp 1688 gỡ -> KHÔNG XÓA RECORD, chỉ set sourceAvailable = false & stock = 0
        updatedVariants.push({
          ...existing,
          stockQuantity: 0,
          sourceAvailable: false
        });
        removedSkuIds.push(existing.sourceSkuId);
      }
    }

    // 2. Những SKU mới xuất hiện trên 1688 mà web chưa có
    const newVariantsCount = latestSkuIdMap.size;
    for (const newVariant of latestSkuIdMap.values()) {
      updatedVariants.push(newVariant);
    }

    return {
      updatedVariants,
      removedSkuIds,
      newVariantsCount
    };
  }
}
