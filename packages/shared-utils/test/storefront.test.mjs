import test from "node:test";
import assert from "node:assert/strict";
import { generateVietQRUrl } from "../dist/store-export-builder.js";
import { calculateStorefrontPricing } from "../dist/storefront-pricing.js";
import {
  buildStorefrontVariantGroups,
  findStorefrontVariant,
  getStorefrontVariantMaxQuantity,
  isStorefrontVariantAvailable,
  isStorefrontVariantOptionAvailable,
  normalizeCatalogKey
} from "../dist/storefront-catalog.js";

test("Storefront Suite - VietQR URL Generation & Checkout Contracts", async (t) => {
  await t.test("1. generateVietQRUrl produces valid Napas 247 QuickLink", () => {
    const qrUrl = generateVietQRUrl({
      bankCode: "MBBank",
      accountNo: "888899991688",
      accountName: "CHU CUA HANG 1688",
      amountVND: 350000,
      description: "HUB-#992812"
    });

    assert.ok(qrUrl.startsWith("https://img.vietqr.io/image/MBBank-888899991688-compact2.png"));
    assert.ok(qrUrl.includes("amount=350000"));
    assert.ok(qrUrl.includes("addInfo="));
    assert.ok(qrUrl.includes("accountName="));
  });

  await t.test("2. generateVietQRUrl handles optional amount and special characters in description", () => {
    const qrUrl = generateVietQRUrl({
      bankCode: "VCB",
      accountNo: "0123456789",
      description: "DH 12345"
    });

    assert.ok(qrUrl.startsWith("https://img.vietqr.io/image/VCB-0123456789-compact2.png"));
    assert.ok(!qrUrl.includes("amount="));
    assert.ok(qrUrl.includes("addInfo=DH%2012345"));
  });

  await t.test("3. generateVietQRUrl refuses an incomplete bank account", () => {
    assert.throws(() => generateVietQRUrl({ accountNo: "0123456789" }), /VIETQR_ACCOUNT_REQUIRED/);
  });

  await t.test("4. storefront pricing uses configured shipping and discount rules", () => {
    const config = {
      freeShipThresholdVND: 500000,
      shippingFeeVND: 25000,
      discountRules: [
        { code: "SAVE10", type: "PERCENT", value: 10, maxDiscountVND: 30000, active: true },
        { code: "SHIP0", type: "FREE_SHIPPING", value: 0, active: true }
      ]
    };

    const percent = calculateStorefrontPricing(400000, config, "save10");
    assert.equal(percent.discountAmountVND, 30000);
    assert.equal(percent.shippingFeeVND, 25000);
    assert.equal(percent.finalTotalVND, 395000);
    assert.equal(percent.appliedDiscountCode, "SAVE10");

    const freeShipping = calculateStorefrontPricing(100000, config, "SHIP0");
    assert.equal(freeShipping.shippingFeeVND, 0);
    assert.equal(freeShipping.finalTotalVND, 100000);

    const invalid = calculateStorefrontPricing(100000, config, "OLD_CODE");
    assert.equal(invalid.couponValid, false);
    assert.equal(invalid.appliedDiscountCode, undefined);
    assert.equal(invalid.finalTotalVND, 125000);
  });
});

test("Storefront Suite - catalog route and variation contracts", async (t) => {
  await t.test("normalizes Vietnamese collection names to stable route handles", () => {
    assert.equal(normalizeCatalogKey("Biển Mica Đèn LED"), "bien-mica-den-led");
  });

  await t.test("builds generic variation groups including specDetails", () => {
    const variants = [
      { sourceSkuId: "WHITE-12-MATTE", colorName: "Trắng", sizeName: "12oz", specDetails: { Finish: "Nhám" }, sellingPriceVND: 200000, costPriceVND: 100000, stockQuantity: 3 },
      { sourceSkuId: "WHITE-16-GLOSS", colorName: "Trắng", sizeName: "16oz", specDetails: { Finish: "Bóng" }, sellingPriceVND: 220000, costPriceVND: 100000, stockQuantity: 0 },
      { sourceSkuId: "BLACK-16-GLOSS", colorName: "Đen", sizeName: "16oz", specDetails: { Finish: "Bóng" }, sellingPriceVND: 230000, costPriceVND: 100000, stockQuantity: 5 }
    ];
    const groups = buildStorefrontVariantGroups(variants);
    assert.deepEqual(groups.map(group => group.key), ["colorName", "sizeName", "Finish"]);
    assert.deepEqual(groups[0].options.map(option => option.label), ["Trắng", "Đen"]);
  });

  await t.test("keeps SKU combinations valid and marks unavailable combinations disabled", () => {
    const variants = [
      { sourceSkuId: "WHITE-12", colorName: "Trắng", sizeName: "12oz", sellingPriceVND: 200000, costPriceVND: 100000, stockQuantity: 3 },
      { sourceSkuId: "WHITE-16", colorName: "Trắng", sizeName: "16oz", sellingPriceVND: 220000, costPriceVND: 100000, stockQuantity: 0 },
      { sourceSkuId: "BLACK-16", colorName: "Đen", sizeName: "16oz", sellingPriceVND: 230000, costPriceVND: 100000, stockQuantity: 5 }
    ];
    const groups = buildStorefrontVariantGroups(variants);
    assert.equal(isStorefrontVariantOptionAvailable(variants, groups, variants[0], "sizeName", "16oz"), false);
    const selected = findStorefrontVariant(variants, groups, variants[0], "colorName", "Đen");
    assert.equal(selected?.sourceSkuId, "BLACK-16");
    assert.equal(isStorefrontVariantOptionAvailable(variants, groups, selected, "sizeName", "16oz"), true);
  });

  await t.test("treats explicitly available untracked inventory as sellable without inventing stock", () => {
    const variant = {
      sourceSkuId: "MAC-1-PC",
      sellingPriceVND: 700000,
      costPriceVND: 400000,
      stockQuantity: 0,
      sourceAvailable: true,
      inventoryTracked: false,
      selectedForSale: true
    };
    assert.equal(isStorefrontVariantAvailable(variant), true);
    assert.equal(getStorefrontVariantMaxQuantity(variant), 20);
  });

  await t.test("keeps tracked zero stock unavailable", () => {
    const variant = {
      sourceSkuId: "TRACKED-EMPTY",
      sellingPriceVND: 100000,
      costPriceVND: 50000,
      stockQuantity: 0,
      sourceAvailable: true,
      inventoryTracked: true,
      selectedForSale: true
    };
    assert.equal(isStorefrontVariantAvailable(variant), false);
    assert.equal(getStorefrontVariantMaxQuantity(variant), 0);
  });
});
