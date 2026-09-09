export interface PricingRuleConfig {
  id: string;
  name: string;
  categoryKeyword?: string;
  exchangeRate: number;        // e.g. 3800 VND per CNY
  domesticChinaShipVND: number;// e.g. 12000 VND
  intlShipPerKgVND: number;    // e.g. 30000 VND/kg
  estimatedWeightKg: number;   // e.g. 0.3 kg
  multiplier: number;          // e.g. 2.2
  platformFeeRate: number;     // e.g. 0.05 (5%)
  minProfitVND: number;        // e.g. 50000 VND
  minMarginPercent: number;    // e.g. 35 (%)
  roundToThousand: boolean;    // true -> round to 1000 or 900
}

export interface PricingBreakdown {
  costCNY: number;
  costVND: number;
  chinaShipVND: number;
  intlShipVND: number;
  platformFeeVND: number;
  totalCostVND: number;
  multiplier: number;
  calculatedPriceVND: number;
  finalSellingPriceVND: number;
  grossProfitVND: number;
  marginPercent: number;
  isLowMarginWarning: boolean;
  isLowProfitWarning: boolean;
}
