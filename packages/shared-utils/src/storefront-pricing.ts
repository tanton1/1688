import { StorefrontConfig, StorefrontDiscountRule } from "@hub1688/shared-types";

export interface StorefrontPricingResult {
  subtotalVND: number;
  discountAmountVND: number;
  shippingFeeVND: number;
  finalTotalVND: number;
  appliedDiscountCode?: string;
  couponValid: boolean;
  freeShipping: boolean;
}

const normalizeMoney = (value: number | undefined): number =>
  Number.isFinite(value) ? Math.max(0, Math.round(value!)) : 0;

export function findActiveStorefrontDiscount(
  config: Pick<StorefrontConfig, "discountRules">,
  discountCode?: string
): StorefrontDiscountRule | undefined {
  const code = discountCode?.trim().toUpperCase();
  if (!code) return undefined;
  return (config.discountRules || []).find(rule => rule.active && rule.code.trim().toUpperCase() === code);
}

export function calculateStorefrontPricing(
  subtotalVND: number,
  config: Pick<StorefrontConfig, "freeShipThresholdVND" | "shippingFeeVND" | "discountRules">,
  discountCode?: string
): StorefrontPricingResult {
  const subtotal = normalizeMoney(subtotalVND);
  const normalizedCode = discountCode?.trim().toUpperCase() || undefined;
  const rule = findActiveStorefrontDiscount(config, normalizedCode);

  let discountAmountVND = 0;
  if (rule?.type === "PERCENT") {
    const percent = Math.min(100, Math.max(0, rule.value));
    discountAmountVND = Math.round(subtotal * percent / 100);
    if (rule.maxDiscountVND !== undefined) {
      discountAmountVND = Math.min(discountAmountVND, normalizeMoney(rule.maxDiscountVND));
    }
  } else if (rule?.type === "FIXED") {
    discountAmountVND = Math.min(subtotal, normalizeMoney(rule.value));
  }

  const threshold = normalizeMoney(config.freeShipThresholdVND);
  const freeByThreshold = threshold > 0 && subtotal >= threshold;
  const freeByCoupon = rule?.type === "FREE_SHIPPING";
  const freeShipping = freeByThreshold || freeByCoupon;
  const shippingFeeVND = freeShipping ? 0 : normalizeMoney(config.shippingFeeVND);

  return {
    subtotalVND: subtotal,
    discountAmountVND,
    shippingFeeVND,
    finalTotalVND: Math.max(0, subtotal - discountAmountVND) + shippingFeeVND,
    appliedDiscountCode: rule ? normalizedCode : undefined,
    couponValid: !normalizedCode || Boolean(rule),
    freeShipping
  };
}
