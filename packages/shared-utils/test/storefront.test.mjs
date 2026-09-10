import test from "node:test";
import assert from "node:assert/strict";
import { generateVietQRUrl } from "../dist/store-export-builder.js";

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
});
