import {
  Raw1688SkuProp,
  Raw1688SkuItem,
  NormalizedVariant,
  WebProductVariant,
  PricingRuleConfig
} from "@hub1688/shared-types";
import { applyGlossary, normalizeSizeProp } from "./text-cleaner.js";
import { calculateSellingPrice } from "./pricing-calculator.js";

/**
 * Sinh các tổ hợp biến thể (Cartesian Product) từ các thuộc tính 1688
 */
export function generateCartesianCombinations(
  skuProps: Raw1688SkuProp[],
  skuMap: Record<string, Raw1688SkuItem>,
  pricingRule: PricingRuleConfig,
  customGlossary: Record<string, string> = {}
): WebProductVariant[] {
  if (!skuProps || skuProps.length === 0) {
    // Trường hợp sản phẩm đơn (không phân loại SKU)
    const singleSkuItem = Object.values(skuMap)[0] || {
      skuId: "SINGLE_DEFAULT",
      priceCNY: 0,
      stock: 999,
      attributes: {}
    };

    const pricing = calculateSellingPrice(singleSkuItem.priceCNY, pricingRule);

    return [
      {
        sourceSkuId: singleSkuItem.skuId,
        colorName: "Mặc định",
        sizeName: "Tiêu chuẩn",
        costPriceVND: pricing.totalCostVND,
        sellingPriceVND: pricing.finalSellingPriceVND,
        stockQuantity: singleSkuItem.stock,
        sourceAvailable: true,
        selectedForSale: true
      }
    ];
  }

  // Tách thuộc tính Màu sắc và Kích thước
  const colorProp = skuProps.find(p => p.propNameCN.includes("颜色") || p.propNameCN.includes("色"));
  const sizeProp = skuProps.find(p => p.propNameCN.includes("尺码") || p.propNameCN.includes("尺寸") || p.propNameCN.includes("规格"));
  const otherProps = skuProps.filter(p => p !== colorProp && p !== sizeProp);

  const colors = colorProp ? colorProp.values : [{ valueId: "0", valueCN: "Mặc định", imageUrl: undefined }];
  const sizes = sizeProp ? sizeProp.values : [{ valueId: "0", valueCN: "Tiêu chuẩn", imageUrl: undefined }];

  const variants: WebProductVariant[] = [];

  for (const color of colors) {
    for (const size of sizes) {
      // Tìm SKU Item tương ứng trong skuMap
      // 1688 thường lưu dạng "colorVal>sizeVal" hoặc "0:0;1:1" hoặc qua attributes
      const matchingSku = findMatchingSkuItem(skuMap, color.valueCN, size.valueCN);

      const priceCNY = matchingSku?.priceCNY ?? 0;
      const stock = matchingSku?.stock ?? 0;
      const skuId = matchingSku?.skuId ?? `SKU_${color.valueId}_${size.valueId}`;
      const imageUrl = color.imageUrl || matchingSku?.imageUrl;

      const pricing = calculateSellingPrice(priceCNY, pricingRule);

      const translatedColor = color.valueCN === "Mặc định" ? "Mặc định" : applyGlossary(color.valueCN, customGlossary);
      const normalizedSize = size.valueCN === "Tiêu chuẩn" ? "Tiêu chuẩn" : normalizeSizeProp(size.valueCN);

      variants.push({
        sourceSkuId: skuId,
        colorName: translatedColor,
        sizeName: normalizedSize,
        costPriceVND: pricing.totalCostVND,
        sellingPriceVND: pricing.finalSellingPriceVND,
        stockQuantity: stock,
        imageUrl: imageUrl,
        sourceAvailable: stock > 0,
        selectedForSale: true
      });
    }
  }

  return variants;
}

/**
 * Tìm SKU tương ứng từ skuMap dựa trên giá trị Màu & Size
 */
function findMatchingSkuItem(
  skuMap: Record<string, Raw1688SkuItem>,
  colorCN: string,
  sizeCN: string
): Raw1688SkuItem | undefined {
  const items = Object.values(skuMap);
  if (items.length === 0) return undefined;

  return items.find(item => {
    const attrVals = Object.values(item.attributes || {});
    const matchColor = colorCN === "Mặc định" || attrVals.some(v => v.includes(colorCN) || colorCN.includes(v));
    const matchSize = sizeCN === "Tiêu chuẩn" || attrVals.some(v => v.includes(sizeCN) || sizeCN.includes(v));
    return matchColor && matchSize;
  }) || items[0];
}
