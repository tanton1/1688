import {
  PricingRuleConfig,
  PricingBreakdown,
  WebProductVariant
} from "@hub1688/shared-types";
import {
  DEFAULT_PRICING_RULE,
  calculateSellingPrice
} from "@hub1688/shared-utils";

export class PricingEngineService {
  private rules: PricingRuleConfig[] = [
    DEFAULT_PRICING_RULE,
    {
      id: "CLOTHING_SHIRTS",
      name: "Áo thời trang",
      categoryKeyword: "Áo",
      exchangeRate: 3800,
      domesticChinaShipVND: 12000,
      intlShipPerKgVND: 30000,
      estimatedWeightKg: 0.25,
      multiplier: 2.2,
      platformFeeRate: 0.05,
      minProfitVND: 50000,
      minMarginPercent: 35,
      roundToThousand: true
    },
    {
      id: "CLOTHING_PANTS",
      name: "Quần & Legging",
      categoryKeyword: "Quần",
      exchangeRate: 3800,
      domesticChinaShipVND: 12000,
      intlShipPerKgVND: 30000,
      estimatedWeightKg: 0.35,
      multiplier: 2.3,
      platformFeeRate: 0.05,
      minProfitVND: 60000,
      minMarginPercent: 35,
      roundToThousand: true
    },
    {
      id: "ACCESSORIES",
      name: "Phụ kiện thời trang",
      categoryKeyword: "Phụ kiện",
      exchangeRate: 3800,
      domesticChinaShipVND: 8000,
      intlShipPerKgVND: 30000,
      estimatedWeightKg: 0.15,
      multiplier: 2.5,
      platformFeeRate: 0.05,
      minProfitVND: 40000,
      minMarginPercent: 40,
      roundToThousand: true
    },
    {
      id: "HIGH_VALUE",
      name: "Sản phẩm giá trị cao (> ¥200)",
      categoryKeyword: "HighValue",
      exchangeRate: 3800,
      domesticChinaShipVND: 15000,
      intlShipPerKgVND: 30000,
      estimatedWeightKg: 0.8,
      multiplier: 1.6,
      platformFeeRate: 0.05,
      minProfitVND: 150000,
      minMarginPercent: 25,
      roundToThousand: true
    }
  ];

  public getAllRules(): PricingRuleConfig[] {
    return this.rules.map(rule => ({ ...rule }));
  }

  public replaceRules(rules: PricingRuleConfig[]): void {
    if (rules.length) this.rules = rules.map(rule => ({ ...rule }));
  }

  public createRule(rule: PricingRuleConfig): PricingRuleConfig {
    if (this.rules.some(existing => existing.id === rule.id)) {
      throw new Error("PRICING_RULE_EXISTS");
    }
    this.rules.push({ ...rule });
    return { ...rule };
  }

  public updateRule(id: string, updates: Partial<PricingRuleConfig>): PricingRuleConfig | null {
    const index = this.rules.findIndex(rule => rule.id === id);
    if (index < 0) return null;
    this.rules[index] = { ...this.rules[index], ...updates, id };
    return { ...this.rules[index] };
  }

  public deleteRule(id: string): boolean {
    if (id === DEFAULT_PRICING_RULE.id) return false;
    const initialLength = this.rules.length;
    this.rules = this.rules.filter(rule => rule.id !== id);
    return this.rules.length < initialLength;
  }

  public getRuleById(ruleId?: string): PricingRuleConfig {
    if (!ruleId) return DEFAULT_PRICING_RULE;
    return this.rules.find(r => r.id === ruleId) || DEFAULT_PRICING_RULE;
  }

  public matchRuleByCategory(categoryName: string, priceCNY: number): PricingRuleConfig {
    if (priceCNY >= 200) {
      return this.getRuleById("HIGH_VALUE");
    }
    const matched = this.rules.find(r => r.categoryKeyword && categoryName.includes(r.categoryKeyword));
    return matched || DEFAULT_PRICING_RULE;
  }

  public calculate(priceCNY: number, ruleId?: string): PricingBreakdown {
    const rule = this.getRuleById(ruleId);
    return calculateSellingPrice(priceCNY, rule);
  }

  public applyPricingToVariants(
    variants: WebProductVariant[],
    ruleId?: string
  ): { variants: WebProductVariant[]; minPriceVND: number; maxPriceVND: number } {
    const rule = this.getRuleById(ruleId);
    let minPrice = Infinity;
    let maxPrice = 0;

    const updated = variants.map(v => {
      // Giá vốn CNY ước tính từ costPriceVND hoặc tính trực tiếp
      const cny = v.costPriceVND > 0 ? v.costPriceVND / rule.exchangeRate : 0;
      const breakdown = calculateSellingPrice(cny, rule);

      minPrice = Math.min(minPrice, breakdown.finalSellingPriceVND);
      maxPrice = Math.max(maxPrice, breakdown.finalSellingPriceVND);

      return {
        ...v,
        costPriceVND: breakdown.totalCostVND,
        sellingPriceVND: breakdown.finalSellingPriceVND
      };
    });

    return {
      variants: updated,
      minPriceVND: minPrice === Infinity ? 0 : minPrice,
      maxPriceVND: maxPrice
    };
  }
}
