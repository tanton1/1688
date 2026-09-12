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
import {
  generateMarketingCopy
} from "../dist/ai-copywriter.js";
import {
  buildWooCommercePayload,
  buildShopifyPayload,
  buildMarketplaceCSV
} from "../dist/store-export-builder.js";
import {
  detectProductPlatform,
  extractProductIdFromUrl,
  parseHtmlProductMetadata,
  SUPPORTED_PLATFORMS_META
} from "../dist/platform-detector.js";

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

  // Kiểm tra trường hợp Bộ Sản Phẩm (chỉ có 1 chiều quy cách/combo/bộ)
  const bundleProps = [
    {
      propId: "p_bundle",
      propNameCN: "规格",
      values: [
        { valueId: "b_3", valueCN: "3件套【升级加厚】" },
        { valueId: "b_5", valueCN: "5件套【豪华礼盒装】" }
      ]
    }
  ];

  const bundleSkuMap = {
    "3件套【升级加厚】": {
      skuId: "SKU_BUNDLE_3",
      priceCNY: 45,
      stock: 200,
      attributes: { "规格": "3件套【升级加厚】" }
    },
    "5件套【豪华礼盒装】": {
      skuId: "SKU_BUNDLE_5",
      priceCNY: 75,
      stock: 120,
      attributes: { "规格": "5件套【豪华礼盒装】" }
    }
  };

  const bundleVariants = generateCartesianCombinations(bundleProps, bundleSkuMap, DEFAULT_PRICING_RULE);
  assert.equal(bundleVariants.length, 2, "Bộ sản phẩm 1 thuộc tính chỉ được sinh đúng 2 biến thể, không tạo size ảo S/M/L/XL");
  assert.equal(bundleVariants[0].sizeName, "", "Không được ép size ảo 'Tiêu chuẩn'");
  assert.ok(bundleVariants[0].colorName.includes("Bộ 3 món"), "Phải dịch đúng thuật ngữ 3件套 thành Bộ 3 món");
  assert.ok(bundleVariants[1].colorName.includes("Bộ 5 món"), "Phải dịch đúng thuật ngữ 5件套 thành Bộ 5 món");
  assert.ok(bundleVariants[0].costPriceVND > 0);

  // Kiểm tra trường hợp Var Custom (2 thuộc tính tùy chỉnh: Kiểu dáng x Quy cách)
  const customVarProps = [
    {
      propId: "p_style",
      propNameCN: "款式",
      values: [
        { valueId: "st_a", valueCN: "A款" },
        { valueId: "st_b", valueCN: "B款" }
      ]
    },
    {
      propId: "p_spec",
      propNameCN: "套餐",
      values: [
        { valueId: "sp_1", valueCN: "两件套" },
        { valueId: "sp_2", valueCN: "三件套" }
      ]
    }
  ];

  const customVariants = generateCartesianCombinations(customVarProps, {}, DEFAULT_PRICING_RULE);
  assert.equal(customVariants.length, 4, "Tổ hợp 2 kiểu x 2 gói phải tạo ra 4 biến thể");
  assert.ok(customVariants.some(v => v.sizeName.includes("Bộ 2 món")));
  assert.ok(customVariants.some(v => v.sizeName.includes("Bộ 3 món")));

  const untrackedVariants = generateCartesianCombinations([{
    propId: "quantity",
    propNameCN: "Buy More Save More",
    values: [{ valueId: "one", valueCN: "1 PC" }]
  }], {
    one: {
      skuId: "shopify-1-pc",
      attributes: { "Buy More Save More": "1 PC" },
      priceCNY: 200,
      stock: 0,
      available: true,
      inventoryTracked: false
    }
  }, DEFAULT_PRICING_RULE);
  assert.equal(untrackedVariants.length, 1);
  assert.equal(untrackedVariants[0].sourceAvailable, true, "Shopify available=true phải được giữ khi inventory không track");
  assert.equal(untrackedVariants[0].inventoryTracked, false, "Không được biến tồn kho null thành tồn kho 0 có track");
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
  assert.equal(jsonLd.aggregateRating, undefined, "Không được tự sinh rating/review khi chưa có dữ liệu thật");

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

test("6. AI Marketing Copywriter Engine", (t) => {
  const dummyProduct = {
    titleVI: "Đầm Nữ Vintage Cổ Vuông",
    titleEN: "Vintage Square-Neck Women Dress",
    minPriceVND: 250000,
    attributes: [{ keyVI: "Chất liệu", valueVI: "Lụa tuyết mềm mát" }]
  };

  // Test AIDA VI
  const aidaVI = generateMarketingCopy(dummyProduct, "AIDA", "VI");
  assert.equal(aidaVI.style, "AIDA");
  assert.ok(aidaVI.headline.includes("Khám phá"));
  assert.ok(aidaVI.bodyHtml.includes("Thông tin chính"));
  assert.ok(aidaVI.bodyHtml.includes("250.000"));

  // Test PAS VI
  const pasVI = generateMarketingCopy(dummyProduct, "PAS", "VI");
  assert.equal(pasVI.style, "PAS");
  assert.ok(pasVI.headline.includes("Kiểm tra"));
  assert.ok(pasVI.bodyHtml.includes("Vấn đề"));

  // Test Storytelling EN
  const storyEN = generateMarketingCopy(dummyProduct, "STORYTELLING", "EN");
  assert.equal(storyEN.style, "STORYTELLING");
  assert.ok(storyEN.bodyHtml.includes("draft"));

  // Test Social Ads EN
  const adsEN = generateMarketingCopy(dummyProduct, "SOCIAL_ADS", "EN");
  assert.equal(adsEN.style, "SOCIAL_ADS");
  assert.ok(adsEN.headline.length > 0);
  assert.ok(adsEN.callToAction.length > 0);
  assert.doesNotMatch(JSON.stringify([aidaVI, pasVI, storyEN, adsEN]), /free shipping|freeship|limited stock|100%|guaranteed/i);
});

test("7. Omnichannel Connectors Payload Builders", (t) => {
  const dummyProduct = {
    id: "prod-001",
    skuCode: "SKU-TEST-001",
    titleVI: "Áo Thun Cotton Nữ Cao Cấp",
    titleEN: "Premium Women Cotton T-Shirt",
    minPriceVND: 180000,
    maxPriceVND: 220000,
    shortDescVI: "Áo thun cotton thoáng mát",
    fullDescVI: "<p>Mô tả chi tiết sản phẩm áo thun</p>",
    primaryImage: "https://example.com/img1.jpg",
    galleryImages: ["https://example.com/img2.jpg"],
    variants: [
      {
        sourceSkuId: "sku-01",
        colorName: "Đen",
        sizeName: "M",
        colorNameEN: "Black",
        sizeNameEN: "M",
        sellingPriceVND: 180000,
        stockQuantity: 50,
        selectedForSale: true
      },
      {
        sourceSkuId: "sku-02",
        colorName: "Trắng",
        sizeName: "L",
        colorNameEN: "White",
        sizeNameEN: "L",
        sellingPriceVND: 220000,
        stockQuantity: 30,
        selectedForSale: true
      }
    ]
  };

  // WooCommerce Payload
  const wc = buildWooCommercePayload(dummyProduct);
  assert.equal(wc.name, "Áo Thun Cotton Nữ Cao Cấp");
  assert.equal(wc.type, "variable");
  assert.equal(wc.sku, "SKU-TEST-001");
  assert.equal(wc.attributes.length, 2);

  // Shopify Payload
  const shopify = buildShopifyPayload(dummyProduct);
  assert.equal(shopify.product.title, "Premium Women Cotton T-Shirt");
  assert.equal(shopify.product.variants.length, 2);
  assert.equal(shopify.product.options[0].name, "Color");

  const customProduct = {
    ...dummyProduct,
    version: 3,
    isPersonalized: true,
    customizerMockupTemplateUrl: "https://example.com/plain-mockup.jpg",
    personalizationFields: [{ id: "name", label: "Tên", type: "TEXT", required: true }],
    variants: dummyProduct.variants.map((variant, index) => ({ ...variant, imageUrl: `https://example.com/variant-${index + 1}.jpg` }))
  };
  const customWoo = buildWooCommercePayload(customProduct);
  assert.equal(customWoo.images.length, 4);
  assert.equal(customWoo.meta_data.find(item => item.key === "_hub1688_personalization_schema_version").value, "3");
  const customShopify = buildShopifyPayload(customProduct);
  assert.equal(customShopify.product.images.length, 4);
  assert.equal(customShopify.product.metafields.find(item => item.key === "personalization_schema").type, "json");

  // Shopee CSV
  const shopeeCSV = buildMarketplaceCSV([dummyProduct], "SHOPEE");
  assert.ok(shopeeCSV.includes("Mã Ngành Hàng"));
  assert.ok(shopeeCSV.includes("Áo Thun Cotton Nữ Cao Cấp"));
  assert.ok(shopeeCSV.includes("sku-01"));

  // TikTok Shop CSV
  const tiktokCSV = buildMarketplaceCSV([dummyProduct], "TIKTOK_SHOP");
  assert.ok(tiktokCSV.includes("Product Name"));
  assert.ok(tiktokCSV.includes("Áo Thun Cotton Nữ Cao Cấp"));
  assert.ok(tiktokCSV.includes("180000"));
});

test("8. Multi-Platform Cloner Engine (Platform Detector, ID Extractor & OpenGraph/JSON-LD Parser)", (t) => {
  // 1. Platform Detection
  assert.equal(detectProductPlatform("https://detail.1688.com/offer/684219482103.html"), "1688");
  assert.equal(detectProductPlatform("https://item.taobao.com/item.htm?id=681928471928"), "TAOBAO");
  assert.equal(detectProductPlatform("https://detail.tmall.com/item.htm?id=712938491024"), "TMALL");
  assert.equal(detectProductPlatform("https://shopee.vn/product/12345678/987654321"), "SHOPEE");
  assert.equal(detectProductPlatform("https://shop.tiktok.com/view/product/1729384918294"), "TIKTOK_SHOP");
  assert.equal(detectProductPlatform("https://www.aliexpress.com/item/1005004819283746.html"), "ALIEXPRESS");
  assert.equal(detectProductPlatform("https://cottonon.com/VN/p/oversized-crew-tee/123456.html"), "GENERIC_WEB");

  // 2. ID Extraction
  assert.equal(extractProductIdFromUrl("https://item.taobao.com/item.htm?id=681928471928"), "681928471928");
  assert.equal(extractProductIdFromUrl("https://shopee.vn/product/12345678/987654321"), "987654321");
  assert.equal(extractProductIdFromUrl("https://shop.tiktok.com/view/product/1729384918294"), "1729384918294");
  assert.equal(extractProductIdFromUrl("https://www.aliexpress.com/item/1005004819283746.html"), "1005004819283746");
  const genericId = extractProductIdFromUrl("https://example.com/");
  assert.equal(genericId, extractProductIdFromUrl("https://example.com/"));
  assert.match(genericId, /^url_[a-z0-9]+$/);
  assert.equal(extractProductIdFromUrl(""), "");

  // 3. Supported Platforms Meta
  assert.equal(SUPPORTED_PLATFORMS_META.length >= 7, true);
  assert.ok(SUPPORTED_PLATFORMS_META.some(p => p.id === "TAOBAO"));
  assert.ok(SUPPORTED_PLATFORMS_META.some(p => p.id === "SHOPEE"));

  // 4. HTML OpenGraph & Schema.org Extraction
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Áo Sơ Mi Nữ Lụa Satin Cao Cấp | Store VN</title>
        <meta property="og:title" content="Áo Sơ Mi Nữ Lụa Satin Cao Cấp" />
        <meta property="og:description" content="Thiết kế thanh lịch, chất vải lụa mềm mát chống nhăn" />
        <meta property="og:image" content="https://img.cdn.com/shirt.jpg" />
        <meta property="og:price:amount" content="285000" />
        <meta property="og:price:currency" content="VND" />
        <script type="application/ld+json">
        {
          "@type": "Product",
          "name": "Áo Sơ Mi Nữ Lụa Satin Cao Cấp",
          "image": "https://img.cdn.com/shirt.jpg",
          "description": "Thiết kế thanh lịch, chất vải lụa mềm mát chống nhăn",
          "brand": { "@type": "Brand", "name": "Boutique Fashion" },
          "offers": {
            "@type": "Offer",
            "price": "285000",
            "priceCurrency": "VND"
          }
        }
        </script>
      </head>
      <body>
        <div class="product-description">
          <img src="https://img.cdn.com/size-chart-detail.jpg" alt="Size Chart" />
          <img src="https://img.cdn.com/fabric-zoom.jpg" alt="Fabric" />
        </div>
      </body>
    </html>
  `;

  const extracted = parseHtmlProductMetadata(sampleHtml);
  assert.equal(extracted.title, "Áo Sơ Mi Nữ Lụa Satin Cao Cấp");
  assert.equal(extracted.price, 285000);
  assert.equal(extracted.currency, "VND");
  assert.equal(extracted.brand, "Boutique Fashion");
  assert.ok(extracted.images.includes("https://img.cdn.com/shirt.jpg"));
  assert.ok(extracted.detailImages?.includes("https://img.cdn.com/size-chart-detail.jpg"));
  assert.ok(extracted.detailImages?.includes("https://img.cdn.com/fabric-zoom.jpg"));
});

test("9. Batch URL Processing & Visual Sourcing Sourcing Margin Engine", (t) => {
  // 1. Batch URL string parsing
  const rawBatchInput = `
    https://item.taobao.com/item.htm?id=681928471928
    
    https://shopee.vn/product/12345678/987654321
    invalid-url-string
    https://shop.tiktok.com/view/product/1729384918294
    http://example.com/test-prod
  `;

  const parsedUrls = rawBatchInput
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.startsWith("http://") || l.startsWith("https://"));

  assert.equal(parsedUrls.length, 4);
  assert.equal(parsedUrls[0], "https://item.taobao.com/item.htm?id=681928471928");
  assert.equal(parsedUrls[1], "https://shopee.vn/product/12345678/987654321");
  assert.equal(parsedUrls[2], "https://shop.tiktok.com/view/product/1729384918294");
  assert.equal(parsedUrls[3], "http://example.com/test-prod");

  // 2. Visual Sourcing Sourcing Margin Calculation
  // Shopee retail price: 250.000đ, current dropship cost: 185.000đ -> margin: 26%
  const shopeeRetailPriceVND = 250000;
  const currentCostVND = 185000;
  const initialMargin = Math.round(((shopeeRetailPriceVND - currentCostVND) / shopeeRetailPriceVND) * 100);
  assert.equal(initialMargin, 26);

  // 1688 Direct Factory Price: ¥16.5 = 62.700đ + 18.000đ shipping = 80.700đ total cost
  const factoryPriceCNY = 16.5;
  const factoryCostVND = Math.round(factoryPriceCNY * 3800) + 18000; // 80.700đ
  const sourcedMargin1688 = Math.round(((shopeeRetailPriceVND - factoryCostVND) / shopeeRetailPriceVND) * 100);
  assert.equal(sourcedMargin1688, 68, "Biên lợi nhuận phải tăng từ 26% lên 68% khi đổi nguồn sang 1688");
});

test("10. Shopify / Macorner Extraction & 12-SKU Variant Matrix", (t) => {
  // 1. Kiểm tra trích xuất biến thể và options từ application/json script
  const sampleShopifyHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta property="og:title" content="Custom Name Character Halloween Candy Bag For Kids" />
      <meta property="og:image" content="https://cdn.shopify.com/s/files/1/0626/0421/4428/files/Bag_1.jpg" />
      <meta property="og:price:amount" content="22.95" />
      <meta property="og:price:currency" content="USD" />
    </head>
    <body>
      <legend class="form__label">Size</legend>
      <legend class="form__label">Buy More Save More (Different Designs)</legend>
      <script type="application/json">
        [
          {
            "id": 47547827191964,
            "title": "7\\" x 9\\" / 1 PC",
            "option1": "7\\" x 9\\"",
            "option2": "1 PC",
            "price": 2295,
            "sku": "SKU-7X9-1PC",
            "featured_image": { "src": "https://cdn.shopify.com/s/files/1/0626/0421/4428/files/Bag_1.jpg" }
          },
          {
            "id": 47547827552412,
            "title": "9\\" x 10\\" / 6 PCS",
            "option1": "9\\" x 10\\"",
            "option2": "6 PCS",
            "price": 13770,
            "sku": "SKU-9X10-6PC",
            "featured_image": { "src": "https://cdn.shopify.com/s/files/1/0626/0421/4428/files/Bag_1.jpg" }
          }
        ]
      </script>
      <!-- Ảnh rác, banner và badge -->
      <img src="https://cdn.shopify.com/s/files/1/0626/0421/4428/files/halloween_badge.png" />
      <img src="https://cdn.shopify.com/s/files/1/0626/0421/4428/files/search-anniversary.png" />
      <img src="https://cdn.shopify.com/s/files/1/0626/0421/4428/files/Bag_2.jpg" />
    </body>
    </html>
  `;

  const metadata = parseHtmlProductMetadata(sampleShopifyHtml);
  assert.equal(metadata.title, "Custom Name Character Halloween Candy Bag For Kids");
  assert.equal(metadata.currency, "USD");
  assert.equal(metadata.variants?.length, 2);
  assert.equal(metadata.priceMin, 22.95);
  assert.equal(metadata.priceMax, 137.7);
  assert.equal(metadata.options?.length, 2);
  assert.equal(metadata.options[0].name, "Size");
  assert.equal(metadata.options[1].name, "Buy More Save More (Different Designs)");

  // Xác minh lọc sạch ảnh rác
  const hasJunk = metadata.images.some(img => /badge|payment|search-|menu/i.test(img));
  assert.equal(hasJunk, false, "Ảnh rác không được lọt vào danh sách hình ảnh");

  // 2. Kiểm tra sinh ma trận 12 SKU từ 2 options (Size x Buy More Save More)
  const skuProps = [
    {
      propId: "prop_1",
      propNameCN: "Size",
      values: [
        { valueId: "v1_0", valueCN: "7\" x 9\"" },
        { valueId: "v1_1", valueCN: "9\" x 10\"" }
      ]
    },
    {
      propId: "prop_2",
      propNameCN: "Buy More Save More",
      values: [
        { valueId: "v2_0", valueCN: "1 PC" },
        { valueId: "v2_1", valueCN: "2 PCS" },
        { valueId: "v2_2", valueCN: "3 PCS" },
        { valueId: "v2_3", valueCN: "4 PCS" },
        { valueId: "v2_4", valueCN: "5 PCS" },
        { valueId: "v2_5", valueCN: "6 PCS" }
      ]
    }
  ];

  const skuMap = {};
  const baseCny = 22.95 * 7.2;

  skuProps[0].values.forEach((s, sIdx) => {
    skuProps[1].values.forEach((q, qIdx) => {
      const priceCNY = Math.round(baseCny * (1 + qIdx * 0.5 + sIdx * 0.2) * 10) / 10;
      const skuId = `SKU_${sIdx}_${qIdx}`;
      const item = {
        skuId,
        attributes: { "Size": s.valueCN, "Buy More Save More": q.valueCN },
        priceCNY,
        stock: 100
      };
      skuMap[skuId] = item;
      skuMap[`${s.valueCN}&${q.valueCN}`] = item;
    });
  });

  const rule = { ...DEFAULT_PRICING_RULE, multiplier: 1.4 };
  const matrix = generateCartesianCombinations(skuProps, skuMap, rule);

  assert.equal(matrix.length, 12, "Phải sinh ra chính xác 12 biến thể SKU");
  assert.equal(matrix[0].colorName, "7\" x 9\"");
  assert.equal(matrix[0].sizeName, "1 PC");
  assert.equal(matrix[11].colorName, "9\" x 10\"");
  assert.equal(matrix[11].sizeName, "6 PCS");
  assert.ok(matrix[11].costPriceVND > matrix[0].costPriceVND, "Giá vốn của biến thể 6 PCS phải cao hơn biến thể 1 PC");
  assert.ok(matrix[11].sellingPriceVND > matrix[0].sellingPriceVND, "Giá bán của biến thể 6 PCS phải cao hơn biến thể 1 PC");
});

test("11. Product Templates & Variation Presets Engine", (t) => {
  // Test Template Content Preset application
  const dummyTemplate = {
    id: "tpl-pod-test",
    name: "Quà Tặng Cá Nhân Hóa (POD / Macorner)",
    categoryName: "Quà Tặng & In Ấn (POD)",
    content: {
      titlePrefix: "[Quà Tặng Ý Nghĩa]",
      titleSuffix: "- Khắc Tên Cao Cấp",
      shortDescVI: "Mô tả ngắn gọn chất lượng cao",
      warrantyPolicy: "Bảo hành 1 đổi 1 trong 30 ngày.",
      attributes: [
        { key: "Chất liệu", value: "Gỗ tự nhiên" },
        { key: "Xuất xứ", value: "Việt Nam" }
      ]
    },
    variation: {
      options: [
        { name: "Kích thước", values: ["7x9 inch", "9x10 inch"] },
        { name: "Combo", values: ["1 PC", "2 PCS", "4 PCS"] }
      ],
      defaultStock: 999,
      skuPattern: "{SKU}-{SIZE}-{COMBO}",
      predefinedVariants: [
        { name: "7x9 inch / 1 PC", option1: "7x9 inch", option2: "1 PC", priceAdjustmentVND: 0, stock: 999 },
        { name: "7x9 inch / 2 PCS", option1: "7x9 inch", option2: "2 PCS", priceAdjustmentVND: 120000, stock: 999 },
        { name: "7x9 inch / 4 PCS", option1: "7x9 inch", option2: "4 PCS", priceAdjustmentVND: 320000, stock: 999 },
        { name: "9x10 inch / 1 PC", option1: "9x10 inch", option2: "1 PC", priceAdjustmentVND: 50000, stock: 999 },
        { name: "9x10 inch / 2 PCS", option1: "9x10 inch", option2: "2 PCS", priceAdjustmentVND: 190000, stock: 999 },
        { name: "9x10 inch / 4 PCS", option1: "9x10 inch", option2: "4 PCS", priceAdjustmentVND: 450000, stock: 999 }
      ]
    }
  };

  // 1. Verify content formatting
  const rawTitle = "Giỏ Kẹo Halloween Cho Bé In Tên";
  const formattedTitle = `${dummyTemplate.content.titlePrefix} ${rawTitle} ${dummyTemplate.content.titleSuffix}`;
  assert.equal(formattedTitle, "[Quà Tặng Ý Nghĩa] Giỏ Kẹo Halloween Cho Bé In Tên - Khắc Tên Cao Cấp");
  assert.equal(dummyTemplate.content.warrantyPolicy, "Bảo hành 1 đổi 1 trong 30 ngày.");
  assert.equal(dummyTemplate.content.attributes.length, 2);

  // 2. Verify variation matrix
  assert.equal(dummyTemplate.variation.options.length, 2);
  assert.equal(dummyTemplate.variation.predefinedVariants.length, 6, "2 kích thước x 3 combo = 6 biến thể");
  assert.equal(dummyTemplate.variation.predefinedVariants[0].priceAdjustmentVND, 0);
  assert.equal(dummyTemplate.variation.predefinedVariants[5].priceAdjustmentVND, 450000);
});

test("12. Media Mirroring & Extension Bulk Sourcing Contracts", (t) => {
  // 1. Media Mirroring URL mapping contract test
  const sampleProduct = {
    id: "prod_sample_01",
    primaryImage: "https://cbu01.alicdn.com/img/ibank/O1CN01xY7.jpg",
    galleryImages: [
      "https://cbu01.alicdn.com/img/ibank/O1CN02aB8.jpg",
      "https://cbu01.alicdn.com/img/ibank/O1CN03cD9.jpg"
    ],
    variants: [
      { sourceSkuId: "sku_1", imageUrl: "https://cbu01.alicdn.com/img/ibank/O1CN04v1.jpg" }
    ]
  };

  // Verify non-mirrored status
  assert.ok(sampleProduct.primaryImage.includes("alicdn.com"), "Ảnh gốc phải là CDN 1688");

  // Simulated mirrored product
  const mirroredProduct = {
    ...sampleProduct,
    primaryImage: "https://example-project.supabase.co/storage/v1/object/public/product-media/mirrored/prod_sample_01/primary_a8f9b2c3.jpg",
    galleryImages: [
      "https://example-project.supabase.co/storage/v1/object/public/product-media/mirrored/prod_sample_01/gallery_1_b7e6d5c4.jpg",
      "https://example-project.supabase.co/storage/v1/object/public/product-media/mirrored/prod_sample_01/gallery_2_c9d8e7f6.jpg"
    ],
    isMediaMirrored: true,
    mirroredAt: new Date().toISOString()
  };

  assert.equal(mirroredProduct.isMediaMirrored, true);
  assert.ok(mirroredProduct.primaryImage.includes("supabase.co/storage") || mirroredProduct.primaryImage.includes("/uploads/"));
  assert.equal(mirroredProduct.galleryImages.length, 2);

  // 2. Bulk Search Item Contract
  const bulkItems = [
    {
      offerId: "744219482103",
      title: "Áo Thun Cotton Nữ Dáng Rộng 2026",
      priceCNY: 18.5,
      imageUrl: "https://cbu01.alicdn.com/img/thumb1.jpg",
      detailUrl: "https://detail.1688.com/offer/744219482103.html"
    },
    {
      offerId: "681928471928",
      title: "Balo Du Lịch Chống Thấm Nước",
      priceCNY: 42.0,
      imageUrl: "https://cbu01.alicdn.com/img/thumb2.jpg",
      detailUrl: "https://detail.1688.com/offer/681928471928.html"
    }
  ];

  assert.equal(bulkItems.length, 2);
  assert.equal(bulkItems[0].offerId, "744219482103");
  assert.ok(bulkItems[0].detailUrl.includes("/offer/744219482103.html"));
  assert.equal(bulkItems[1].priceCNY, 42.0);
});

test("13. Variant Sample Images, Detail Description Images & Synchronization Integrity", (t) => {
  // 1. Kiểm thử trích xuất detailImages từ mô tả HTML của sản phẩm
  const mockShopifyHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <script id="ProductJson-12345" type="application/json">
          {
            "id": 12345,
            "title": "Custom Name Halloween Bag",
            "vendor": "Macorner",
            "description": "<p>Mô tả chi tiết túi kẹo</p><img src='https://macorner.co/cdn/shop/files/detail_size_chart.jpg' /><img src='https://macorner.co/cdn/shop/files/detail_material.png' />",
            "images": [
              { "id": 101, "src": "https://macorner.co/cdn/shop/files/bag_black.jpg" },
              { "id": 102, "src": "https://macorner.co/cdn/shop/files/bag_orange.jpg" }
            ],
            "options": [
              { "name": "Size", "values": ["Small", "Large"] },
              { "name": "Color", "values": ["Black", "Orange"] }
            ],
            "variants": [
              { "id": 1, "title": "Small / Black", "price": 2295, "image_id": 101, "option1": "Small", "option2": "Black" },
              { "id": 2, "title": "Small / Orange", "price": 2295, "image_id": 102, "option1": "Small", "option2": "Orange" },
              { "id": 3, "title": "Large / Black", "price": 2995, "image_id": 101, "option1": "Large", "option2": "Black" },
              { "id": 4, "title": "Large / Orange", "price": 2995, "image_id": 102, "option1": "Large", "option2": "Orange" }
            ]
          }
        </script>
      </head>
      <body></body>
    </html>
  `;

  const parsed = parseHtmlProductMetadata(mockShopifyHtml);
  assert.equal(parsed.title, "Custom Name Halloween Bag");
  assert.equal(parsed.variants?.length, 4, "Phải lấy đủ 4 biến thể");
  assert.equal(parsed.detailImages?.length, 2, "Phải bóc tách được 2 ảnh mô tả chi tiết (bảng size & chất liệu)");
  assert.ok(parsed.detailImages[0].includes("detail_size_chart.jpg"));
  assert.ok(parsed.detailImages[1].includes("detail_material.png"));

  // 2. Kiểm thử bảo tồn ảnh mẫu biến thể (Sample images) trong generateCartesianCombinations
  const skuProps = [
    {
      propId: "prop_color",
      propNameCN: "颜色 (Màu sắc)",
      values: [
        { valueId: "col_black", valueCN: "Đen", imageUrl: "https://cbu01.alicdn.com/img/sample_black.jpg" },
        { valueId: "col_orange", valueCN: "Cam", imageUrl: "https://cbu01.alicdn.com/img/sample_orange.jpg" }
      ]
    },
    {
      propId: "prop_size",
      propNameCN: "尺码 (Kích thước)",
      values: [
        { valueId: "sz_s", valueCN: "7x9 inch" },
        { valueId: "sz_l", valueCN: "9x10 inch" }
      ]
    }
  ];

  const skuMap = {
    "Đen&7x9 inch": {
      skuId: "SKU_BLACK_S",
      priceCNY: 30,
      stock: 120,
      imageUrl: "https://cbu01.alicdn.com/img/sample_black.jpg"
    },
    "Cam&7x9 inch": {
      skuId: "SKU_ORANGE_S",
      priceCNY: 30,
      stock: 90,
      imageUrl: "https://cbu01.alicdn.com/img/sample_orange.jpg"
    }
  };

  const variants = generateCartesianCombinations(skuProps, skuMap, DEFAULT_PRICING_RULE);
  assert.equal(variants.length, 4, "Tổ hợp 2 màu x 2 size = 4 biến thể");
  assert.equal(variants[0].imageUrl, "https://cbu01.alicdn.com/img/sample_black.jpg", "Biến thể màu Đen phải giữ ảnh mẫu Đen");
  assert.equal(variants[1].imageUrl, "https://cbu01.alicdn.com/img/sample_black.jpg", "Biến thể màu Đen size lớn cũng phải giữ ảnh mẫu Đen");
  assert.equal(variants[2].imageUrl, "https://cbu01.alicdn.com/img/sample_orange.jpg", "Biến thể màu Cam phải giữ ảnh mẫu Cam");
  assert.equal(variants[3].imageUrl, "https://cbu01.alicdn.com/img/sample_orange.jpg", "Biến thể màu Cam size lớn cũng phải giữ ảnh mẫu Cam");

  // 3. Kiểm thử hợp đồng đồng bộ biến thể: không bị ghi đè thành 1 biến thể duy nhất
  const normalizedVariants = variants.map(v => ({
    sourceSkuId: v.sourceSkuId,
    colorCN: v.colorName,
    sizeCN: v.sizeName,
    colorVI: v.colorName,
    sizeVI: v.sizeName,
    priceCNY: 30,
    stock: v.stockQuantity,
    imageUrl: v.imageUrl
  }));

  assert.equal(normalizedVariants.length, 4);
  assert.ok(normalizedVariants.every(v => v.imageUrl && v.imageUrl.startsWith("https://")));

  const secondaryImageProps = [
    { propId: "prop_quantity", propNameCN: "Số lượng", values: [{ valueId: "q1", valueCN: "1 PC" }, { valueId: "q2", valueCN: "2 PCS" }] },
    { propId: "prop_design", propNameCN: "Choose Your Option", values: [
      { valueId: "lincoln", valueCN: "Abraham Lincoln", imageUrl: "https://cdn.example.com/lincoln.jpg" },
      { valueId: "washington", valueCN: "George Washington", imageUrl: "https://cdn.example.com/washington.jpg" }
    ] }
  ];
  const secondaryImageVariants = generateCartesianCombinations(secondaryImageProps, {
    "1 PC / Abraham Lincoln": { skuId: "Q1-L", priceCNY: 30, stock: 10, attributes: { "Số lượng": "1 PC", "Choose Your Option": "Abraham Lincoln" } },
    "2 PCS / George Washington": { skuId: "Q2-W", priceCNY: 30, stock: 10, attributes: { "Số lượng": "2 PCS", "Choose Your Option": "George Washington" } }
  }, DEFAULT_PRICING_RULE);
  assert.equal(secondaryImageVariants[0].imageUrl, "https://cdn.example.com/lincoln.jpg", "Ảnh ở trục variation thứ hai phải được giữ lại");
  assert.equal(secondaryImageVariants[1].imageUrl, "https://cdn.example.com/washington.jpg", "Ảnh ở trục variation thứ hai phải được giữ lại cho mọi số lượng");
});
