import {
  Raw1688SkuProp,
  Raw1688SkuItem,
  NormalizedVariant,
  WebProductVariant,
  PricingRuleConfig
} from "@hub1688/shared-types";
import { applyGlossary, normalizeSizeProp } from "./text-cleaner.js";
import { calculateSellingPrice } from "./pricing-calculator.js";

const calculateVerifiedPrice = (priceCNY: number, pricingRule: PricingRuleConfig) => {
  if (!Number.isFinite(priceCNY) || priceCNY <= 0) {
    return { totalCostVND: 0, finalSellingPriceVND: 0 };
  }
  return calculateSellingPrice(priceCNY, pricingRule);
};

/**
 * Sinh các tổ hợp biến thể (Cartesian Product) từ các thuộc tính 1688
 */
export function generateCartesianCombinations(
  skuProps: Raw1688SkuProp[],
  skuMap: Record<string, Raw1688SkuItem> = {},
  pricingRule: PricingRuleConfig,
  customGlossary: Record<string, string> = {}
): WebProductVariant[] {
  // 1. Trường hợp sản phẩm đơn (không phân loại SKU)
  if (!skuProps || skuProps.length === 0) {
    const singleSkuItem = Object.values(skuMap || {})[0];
    const safeSingleSkuItem = singleSkuItem || {
      skuId: "SINGLE_DEFAULT",
      priceCNY: 0,
      stock: 0,
      attributes: {}
    };

    const pricing = calculateVerifiedPrice(safeSingleSkuItem.priceCNY, pricingRule);

    return [
      {
        sourceSkuId: safeSingleSkuItem.skuId,
        colorName: "Mặc định",
        sizeName: "",
        costPriceVND: pricing.totalCostVND,
        sellingPriceVND: pricing.finalSellingPriceVND,
        stockQuantity: safeSingleSkuItem.stock,
        sourceAvailable: safeSingleSkuItem.stock > 0,
        selectedForSale: Boolean(singleSkuItem)
      }
    ];
  }

  const defaultPriceCNY = Object.values(skuMap || {}).find(item => item.priceCNY > 0)?.priceCNY ?? 0;

  // 2. Trường hợp sản phẩm 1 thuộc tính (Rất phổ biến ở Bộ sản phẩm, Combo, Quy cách, Var custom đơn)
  if (skuProps.length === 1) {
    const prop = skuProps[0];
    const values = prop.values && prop.values.length > 0
      ? prop.values
      : [{ valueId: "0", valueCN: "Mặc định", imageUrl: undefined }];

    return values.map((val, idx) => {
      const matchingSku = findMatchingSkuItem(skuMap, val.valueCN, undefined, val.valueId);
      const rawPrice = matchingSku?.priceCNY ?? defaultPriceCNY;
      const priceCNY = rawPrice > 0 ? rawPrice : defaultPriceCNY;
      const stock = matchingSku?.stock ?? 0;
      const skuId = matchingSku?.skuId || matchingSku?.specId || `SKU_${val.valueId || idx}`;
      const imageUrl = val.imageUrl || matchingSku?.imageUrl;

      const pricing = calculateVerifiedPrice(priceCNY, pricingRule);
      const translatedName = val.valueCN === "Mặc định" ? "Mặc định" : applyGlossary(val.valueCN, customGlossary);

      return {
        sourceSkuId: skuId,
        colorName: translatedName,
        sizeName: "", // Không gán "Tiêu chuẩn" gây rối cho bộ sản phẩm
        specDetails: { [prop.propNameCN || "Phân loại"]: val.valueCN },
        costPriceVND: pricing.totalCostVND,
        sellingPriceVND: pricing.finalSellingPriceVND,
        stockQuantity: stock,
        imageUrl,
        sourceAvailable: stock > 0,
        selectedForSale: Boolean(matchingSku)
      };
    });
  }

  // 3. Trường hợp sản phẩm 2 hoặc nhiều thuộc tính (Màu x Size, Mẫu x Quy cách bộ, Var Custom 1 x Var Custom 2)
  // Trục 1: Ưu tiên thuộc tính màu sắc, mẫu mã hoặc thuộc tính đầu tiên
  const colorProp = skuProps.find(p =>
    p.propNameCN.includes("颜色") || p.propNameCN.includes("色") ||
    /màu|color|colour|style|kiểu/i.test(p.propNameCN)
  );

  const primaryProp = colorProp || skuProps[0];
  // Trục 2: Bắt buộc phải thuộc các thuộc tính còn lại (không bao giờ trùng primaryProp)
  const remainingProps = skuProps.filter(p => p !== primaryProp);
  const secondaryCandidate = remainingProps.find(p =>
    p.propNameCN.includes("尺码") || p.propNameCN.includes("尺寸") || p.propNameCN.includes("规格") ||
    p.propNameCN.includes("套餐") || p.propNameCN.includes("容量") ||
    /size|kích thước|dung tích|chiều dài|bộ|combo/i.test(p.propNameCN)
  );

  const secondaryProp = secondaryCandidate || remainingProps[0] || skuProps[1];

  const primaryValues = primaryProp && primaryProp.values?.length > 0
    ? primaryProp.values
    : [{ valueId: "0", valueCN: "Mặc định", imageUrl: undefined }];

  const secondaryValues = secondaryProp && secondaryProp.values?.length > 0
    ? secondaryProp.values
    : [{ valueId: "0", valueCN: "Mặc định", imageUrl: undefined }];

  const variants: WebProductVariant[] = [];

  for (const v1 of primaryValues) {
    for (const v2 of secondaryValues) {
      const matchingSku = findMatchingSkuItem(skuMap, v1.valueCN, v2.valueCN, v1.valueId, v2.valueId);

      const rawPrice = matchingSku?.priceCNY ?? defaultPriceCNY;
      const priceCNY = rawPrice > 0 ? rawPrice : defaultPriceCNY;
      const stock = matchingSku?.stock ?? 0;
      const skuId = matchingSku?.skuId || matchingSku?.specId || `SKU_${v1.valueId}_${v2.valueId}`;
      const imageUrl = v1.imageUrl || matchingSku?.imageUrl;

      const pricing = calculateVerifiedPrice(priceCNY, pricingRule);

      const translatedPrimary = v1.valueCN === "Mặc định" ? "Mặc định" : applyGlossary(v1.valueCN, customGlossary);
      
      // Nếu là chữ cái size (S, M, L, XL...) thì normalizeSizeProp, còn nếu là bộ sản phẩm / quy cách thì applyGlossary
      const isLetterSize = /^(?:[x|2-5]?s|[x|2-5]?l|m|均码|freesize)$/i.test(v2.valueCN.trim());
      const translatedSecondary = isLetterSize
        ? normalizeSizeProp(v2.valueCN)
        : (v2.valueCN === "Mặc định" ? "" : applyGlossary(v2.valueCN, customGlossary));

      variants.push({
        sourceSkuId: skuId,
        colorName: translatedPrimary,
        sizeName: translatedSecondary,
        specDetails: {
          [primaryProp.propNameCN || "Thuộc tính 1"]: v1.valueCN,
          [secondaryProp.propNameCN || "Thuộc tính 2"]: v2.valueCN
        },
        costPriceVND: pricing.totalCostVND,
        sellingPriceVND: pricing.finalSellingPriceVND,
        stockQuantity: stock,
        imageUrl,
        sourceAvailable: stock > 0,
        selectedForSale: Boolean(matchingSku)
      });
    }
  }

  return variants;
}

/**
 * Tìm SKU tương ứng từ skuMap dựa trên giá trị và ID của các thuộc tính
 */
function findMatchingSkuItem(
  skuMap: Record<string, Raw1688SkuItem> = {},
  val1CN: string,
  val2CN?: string,
  val1Id?: string,
  val2Id?: string
): Raw1688SkuItem | undefined {
  if (!skuMap || Object.keys(skuMap).length === 0) return undefined;
  const items = Object.values(skuMap);
  if (items.length === 0) return undefined;

  // 1. Thử tìm chính xác bằng các định dạng Key phổ biến của 1688
  const candidateKeys = [
    val2CN ? `${val1CN}&${val2CN}` : val1CN,
    val2CN ? `${val1CN}>${val2CN}` : val1CN,
    val2CN ? `${val1CN};${val2CN}` : val1CN,
    val2CN ? `${val1CN} ${val2CN}` : val1CN,
    val1CN,
    val1Id && val2Id ? `${val1Id}_${val2Id}` : (val1Id || ""),
    val1Id || ""
  ].filter(Boolean);

  for (const k of candidateKeys) {
    if (skuMap[k]) return skuMap[k];
  }

  // 2. Tìm trong thuộc tính attributes của từng SKU
  const matched = items.find(item => {
    if (!item) return false;
    const attrs = Object.values(item.attributes || {});
    if (attrs.length === 0) return false;

    const match1 = val1CN === "Mặc định" || attrs.some(v => v && (v === val1CN || v.includes(val1CN) || val1CN.includes(v)));
    if (!val2CN || val2CN === "Mặc định" || val2CN === "") {
      return match1;
    }
    const match2 = attrs.some(v => v && (v === val2CN || v.includes(val2CN) || val2CN.includes(v)));
    return match1 && match2;
  });

  if (matched) return matched;

  // 3. Khớp 1 thuộc tính nếu trục thứ hai là mặc định
  if (val1CN && val1CN !== "Mặc định") {
    const singleMatch = items.find(item => {
      const attrs = Object.values(item.attributes || {});
      return attrs.some(v => v && (v === val1CN || v.includes(val1CN) || val1CN.includes(v)));
    });
    if (singleMatch) return singleMatch;
  }

  return undefined;
}
