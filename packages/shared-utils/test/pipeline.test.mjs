import test from "node:test";
import assert from "node:assert/strict";

// Import modules from shared-utils source (or we can test functions directly)
import {
  clean1688Title,
  applyGlossary,
  normalizeSizeProp
} from "../dist/text-cleaner.js";
import {
  calculateSellingPrice,
  DEFAULT_PRICING_RULE
} from "../dist/pricing-calculator.js";
import {
  generateCartesianCombinations
} from "../dist/sku-generator.js";
import {
  evaluateProductQuality
} from "../dist/quality-evaluator.js";

test("1. Text Cleaner & Glossary Engine", (t) => {
  const rawTitle = "2026新款 厂家直销 跨境专供 爆款 女士高腰弹力速干瑜伽裤 1688一件代发";
  const cleaned = clean1688Title(rawTitle);
  assert.equal(cleaned.includes("2026新款"), false, "Phải loại bỏ '2026新款'");
  assert.equal(cleaned.includes("厂家直销"), false, "Phải loại bỏ '厂家直销'");
  assert.equal(cleaned.includes("一件代发"), false, "Phải loại bỏ '一件代发'");

  const translated = applyGlossary(cleaned);
  assert.equal(translated.includes("Quần Legging Nữ"), true, "Phải dịch '瑜伽裤' thành 'Quần Legging Nữ'");
  assert.equal(translated.includes("Cạp cao"), true, "Phải dịch '高腰' thành 'Cạp cao'");

  assert.equal(normalizeSizeProp("s"), "S");
  assert.equal(normalizeSizeProp("xl"), "XL");
  assert.equal(normalizeSizeProp("均码"), "Freesize");
});

test("2. Pricing Engine & Margin Safety", (t) => {
  const costCNY = 32; // ¥32
  const pricing = calculateSellingPrice(costCNY, DEFAULT_PRICING_RULE);

  // 32 * 3800 = 121.600đ
  assert.equal(pricing.costVND, 121600);
  assert.equal(pricing.chinaShipVND, 12000);
  assert.ok(pricing.totalCostVND > 140000);
  assert.ok(pricing.finalSellingPriceVND >= 300000, "Giá bán lẻ phải đạt biên lợi nhuận x2.2");
  assert.ok(pricing.marginPercent >= 35, "Margin phải đạt chuẩn an toàn > 35%");
  assert.equal(pricing.isLowMarginWarning, false);
});

test("3. SKU Matrix Cartesian Product Generator", (t) => {
  const skuProps = [
    {
      propId: "p_col",
      propNameCN: "颜色",
      values: [
        { valueId: "c_black", valueCN: "黑色" },
        { valueId: "c_white", valueCN: "白色" }
      ]
    },
    {
      propId: "p_size",
      propNameCN: "尺码",
      values: [
        { valueId: "s_m", valueCN: "M" },
        { valueId: "s_l", valueCN: "L" }
      ]
    }
  ];

  const skuMap = {
    "c_black_s_m": {
      skuId: "1688_SKU_BLACK_M",
      priceCNY: 32,
      stock: 150,
      attributes: { "颜色": "黑色", "尺码": "M" }
    }
  };

  const variants = generateCartesianCombinations(skuProps, skuMap, DEFAULT_PRICING_RULE);
  // 2 colors x 2 sizes = 4 variants
  assert.equal(variants.length, 4, "Tổ hợp 2 màu x 2 size phải tạo ra 4 variants");
  assert.ok(variants.some(v => v.colorName === "Đen" && v.sizeName === "M"));
  assert.ok(variants.some(v => v.colorName === "Trắng" && v.sizeName === "L"));
});

test("4. Quality Readiness Score Evaluator", (t) => {
  const dummyProduct = {
    titleVI: "Quần Legging Nữ Cạp Cao Co Giãn Tập Gym Yoga",
    categoryName: "Thời trang nữ",
    primaryImage: "https://example.com/img1.jpg",
    galleryImages: ["https://example.com/img2.jpg", "https://example.com/img3.jpg", "https://example.com/img4.jpg"],
    fullDescVI: "Giới thiệu sản phẩm chi tiết với đầy đủ thông số chất liệu và hướng dẫn chọn size chuẩn xác...",
    supplierName: "Shop Uy Tín 1688",
    variants: [
      {
        sourceSkuId: "1688_001",
        costPriceVND: 120000,
        sellingPriceVND: 299000,
        stockQuantity: 100,
        sourceAvailable: true,
        selectedForSale: true
      }
    ]
  };

  const evalResult = evaluateProductQuality(dummyProduct);
  assert.ok(evalResult.totalScore >= 80, `Điểm chất lượng phải cao: ${evalResult.totalScore}`);
  assert.equal(evalResult.canPublish, true, "Sản phẩm đủ điều kiện publish");
});
