import test from "node:test";
import assert from "node:assert/strict";

// Import modules from shared-utils source
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
import {
  generateSlug,
  extractSEOKeywords,
  generateSEOMeta,
  generateImageAltTags,
  generateProductFAQs,
  generateProductJsonLd,
  auditListingSEO
} from "../dist/seo-optimizer.js";

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

test("5. SEO Optimizer Engine (Slug, Keywords, Alt, Meta, FAQs, Schema)", (t) => {
  // Test Slug Generator
  const slug = generateSlug("Đầm Hoa Nhí Vintage Dáng Xòe Tay Phồng Cổ Vuông Tiểu Thư 2026!");
  assert.equal(slug, "dam-hoa-nhi-vintage-dang-xoe-tay-phong-co-vuong-tieu-thu-2026");

  // Test Keywords Extraction
  const keywordsVI = extractSEOKeywords("Đầm Hoa Nhí Vintage Dáng Xòe", "Đầm & Váy", "VI");
  assert.ok(keywordsVI.length >= 3);
  assert.ok(keywordsVI.some(k => k.includes("đầm hoa nhí")));

  // Test Meta Generation
  const meta = generateSEOMeta("Đầm Hoa Nhí Vintage Dáng Xòe", "Đầm & Váy", [{ keyVI: "Chất liệu", valueVI: "Voan Chiffon" }], "VI");
  assert.ok(meta.metaTitle.includes("Đầm Hoa Nhí"));
  assert.ok(meta.metaDescription.includes("Voan Chiffon"));
  assert.ok(meta.metaDescription.length > 100 && meta.metaDescription.length <= 165);

  // Test Image Alt Tags
  const alts = generateImageAltTags(
    "Đầm Hoa Nhí Vintage",
    "https://img.alicdn.com/primary.jpg",
    ["https://img.alicdn.com/gallery1.jpg"],
    ["https://img.alicdn.com/detail1.jpg"]
  );
  assert.equal(alts.length, 3);
  assert.ok(alts[0].alt.includes("Ảnh đại diện"));
  assert.ok(alts[1].alt.includes("Góc chụp chi tiết #1"));
  assert.ok(alts[2].alt.includes("Size Chart"));

  // Test FAQs
  const faqs = generateProductFAQs("Đầm Hoa Nhí", "Đầm", "VI");
  assert.ok(faqs.length >= 3);
  assert.ok(faqs[0].question.includes("kích cỡ"));

  // Test JSON-LD Schema
  const jsonLd = generateProductJsonLd({
    titleVI: "Đầm Hoa Nhí Vintage",
    skuCode: "SKU-TEST-001",
    minPriceVND: 250000,
    maxPriceVND: 290000,
    primaryImage: "https://img.alicdn.com/primary.jpg"
  });
  assert.equal(jsonLd["@type"], "Product");
  assert.equal(jsonLd.sku, "SKU-TEST-001");
  assert.equal(jsonLd.offers.lowPrice, 250000);

  // Test SEO Audit
  const audit = auditListingSEO({
    titleVI: "Đầm Hoa Nhí Vintage Dáng Xòe Cổ Vuông Phồng Cao Cấp",
    slug: "dam-hoa-nhi-vintage",
    metaDescription: meta.metaDescription,
    imagesSEO: alts,
    focusKeywords: keywordsVI,
    faqs
  });
  assert.ok(audit.score >= 80, `SEO Score phải đạt chuẩn cao: ${audit.score}`);
  assert.equal(audit.checks.every(c => c.passed), true, "Tất cả tiêu chí SEO phải pass");
});
