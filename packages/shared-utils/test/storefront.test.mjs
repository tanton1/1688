import test from "node:test";
import assert from "node:assert/strict";
import { generateVietQRUrl } from "../dist/store-export-builder.js";
import { calculateStorefrontPricing } from "../dist/storefront-pricing.js";

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
