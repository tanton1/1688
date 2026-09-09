import { PricingRuleConfig, PricingBreakdown } from "@hub1688/shared-types";

export const DEFAULT_PRICING_RULE: PricingRuleConfig = {
  id: "DEFAULT_FASHION",
  name: "Mặc định Thời trang & Đồ gia dụng",
  exchangeRate: 3800,
  domesticChinaShipVND: 12000,
  intlShipPerKgVND: 30000,
  estimatedWeightKg: 0.35,
  multiplier: 2.2,
  platformFeeRate: 0.05,
  minProfitVND: 50000,
  minMarginPercent: 35,
  roundToThousand: true
};

/**
 * Tính toán chi tiết giá bán, giá vốn và biên lợi nhuận
 */
export function calculateSellingPrice(
  costCNY: number,
  rule: PricingRuleConfig = DEFAULT_PRICING_RULE
): PricingBreakdown {
  const safeCostCNY = Math.max(0, costCNY);
  const costVND = Math.round(safeCostCNY * rule.exchangeRate);
  const chinaShipVND = rule.domesticChinaShipVND;
  const intlShipVND = Math.round(rule.estimatedWeightKg * rule.intlShipPerKgVND);
  
  // Tổng chi phí trực tiếp mua hàng
  const directCost = costVND + chinaShipVND + intlShipVND;
  
  // Tổng chi phí sau khi tính phí sàn thương mại điện tử
  const platformFeeRate = Math.min(0.5, Math.max(0, rule.platformFeeRate));
  const totalCostVND = Math.round(directCost / (1 - platformFeeRate));
  const platformFeeVND = totalCostVND - directCost;

  // Tính giá bán theo hệ số multiplier
  const calculatedPriceVND = Math.round(totalCostVND * rule.multiplier);

  // Làm tròn giá (Round to 1,000 / 9,000 psychological pricing)
  let finalSellingPriceVND = calculatedPriceVND;
  if (rule.roundToThousand) {
    // Làm tròn đuôi 9.000 (Ví dụ: 343.560 -> 349.000)
    const thousands = Math.ceil(calculatedPriceVND / 10000) * 10000;
    const candidate9k = thousands - 1000;
    finalSellingPriceVND = candidate9k > calculatedPriceVND ? candidate9k : thousands + 9000;
    if (finalSellingPriceVND < calculatedPriceVND) {
      finalSellingPriceVND = Math.ceil(calculatedPriceVND / 1000) * 1000;
    }
  }

  const grossProfitVND = finalSellingPriceVND - totalCostVND;
  const marginPercent = finalSellingPriceVND > 0
    ? Math.round((grossProfitVND / finalSellingPriceVND) * 10000) / 100
    : 0;

  return {
    costCNY: safeCostCNY,
    costVND,
    chinaShipVND,
    intlShipVND,
    platformFeeVND,
    totalCostVND,
    multiplier: rule.multiplier,
    calculatedPriceVND,
    finalSellingPriceVND,
    grossProfitVND,
    marginPercent,
    isLowProfitWarning: grossProfitVND < rule.minProfitVND,
    isLowMarginWarning: marginPercent < rule.minMarginPercent
  };
}
