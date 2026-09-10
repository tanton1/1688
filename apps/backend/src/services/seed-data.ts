import { WebProduct, ProductDiffSummary } from "@hub1688/shared-types";
import {
  extractSEOKeywords,
  generateSEOMeta,
  generateImageAltTags,
  generateProductFAQs,
  generateProductJsonLd
} from "@hub1688/shared-utils";

function enrichSeedWithSEO(p: WebProduct): WebProduct {
  const metaVI = generateSEOMeta(p.titleVI, p.categoryName, p.attributes, "VI");
  const metaEN = generateSEOMeta(p.titleEN || p.titleVI, p.categoryName, p.attributes, "EN");
  const focusKeywordsVI = extractSEOKeywords(p.titleVI, p.categoryName, "VI");
  const focusKeywordsEN = extractSEOKeywords(p.titleEN || p.titleVI, p.categoryName, "EN");
  const imagesSEO = generateImageAltTags(
    p.titleVI,
    p.primaryImage,
    p.galleryImages,
    p.detailImages || [],
    p.variants
  );
  const faqs = generateProductFAQs(p.titleVI, p.categoryName, "VI");
  const jsonLdSchema = generateProductJsonLd(p);

  return {
    ...p,
    metaTitle: metaVI.metaTitle,
    metaDescription: metaVI.metaDescription,
    focusKeywords: focusKeywordsVI,
    imagesSEO,
    faqs,
    seo: {
      metaTitleVI: metaVI.metaTitle,
      metaTitleEN: metaEN.metaTitle,
      metaDescriptionVI: metaVI.metaDescription,
      metaDescriptionEN: metaEN.metaDescription,
      focusKeywordsVI,
      focusKeywordsEN,
      imagesSEO,
      faqs,
      jsonLdSchema,
      seoScore: 98
    }
  };
}

const RAW_SEED_PRODUCTS: WebProduct[] = [
  {
    id: "prod_1688_715421588882",
    slug: "ao-so-mi-nu-linen-form-rong-phong-cach-han-quoc-7154",
    skuCode: "SP-SMN-01",
    
    // Tiếng Việt
    titleVI: "Áo Sơ Mi Nữ Linen Form Rộng Cổ V Phong Cách Hàn Quốc 2026",
    titleVariants: {
      original: "夏季复古棉麻衬衫女韩版宽松显瘦V领中袖上衣",
      clean: "Áo Sơ Mi Nữ Linen Form Rộng Cổ V Phong Cách Hàn Quốc 2026",
      literal: "Áo sơ mi vải lanh cotton mùa hè dáng rộng cổ chữ V phong cách Hàn Quốc",
      seo: "Áo Sơ Mi Nữ Linen Dáng Rộng Tay Lỡ Cực Mát Mùa Hè 2026",
      display: "Áo Sơ Mi Nữ Linen Form Rộng Cổ V Phong Cách Hàn Quốc 2026"
    },
    shortDescVI: "Chất liệu linen tự nhiên thoáng mát, form rộng giấu dáng cực tốt, chuẩn style Hàn Quốc.",
    fullDescVI: `### GIỚI THIỆU SẢN PHẨM
Áo Sơ Mi Nữ Linen Form Rộng Cổ V được sản xuất với tiêu chuẩn chất lượng cao từ xưởng dệt may Quảng Châu, mang phong cách trẻ trung, thoáng mát lý tưởng cho mùa hè.

### ĐẶC ĐIỂM NỔI BẬT
• Chất liệu: 70% Cotton, 30% Linen tự nhiên, thấm hút mồ hôi vượt trội.
• Thiết kế: Dáng suông rộng tay lỡ, cổ chữ V tôn dáng cổ thanh thoát.
• Đường may kép chắc chắn, khuy áo bằng vỏ ốc tinh xảo.
• Phù hợp: Đi làm công sở, dạo phố, đi biển mùa hè.`,

    // Tiếng Anh (Global E-Commerce)
    titleEN: "Women's Oversized Linen Blouse V-Neck Korean Casual Summer Top",
    titleVariantsEN: {
      original: "夏季复古棉麻衬衫女韩版宽松显瘦V领中袖上衣",
      clean: "Women's Oversized Linen Blouse V-Neck Korean Summer Top",
      literal: "Summer retro cotton linen shirt women Korean loose slimming V-neck mid-sleeve top",
      seo: "Women's Linen Blouse Oversized V-Neck Breathable Short Sleeve Summer Shirt",
      display: "Women's Oversized Linen Blouse V-Neck (New Arrival 2026)"
    },
    shortDescEN: "Natural breathable cotton-linen blend with relaxed oversized silhouette and flattering V-neckline.",
    fullDescEN: `### PRODUCT OVERVIEW
Women's Oversized Linen Blouse features an airy cotton-linen weave, dropped shoulders, and a clean V-neckline designed for effortless summer style.

### KEY HIGHLIGHTS
• Premium 70% Cotton / 30% Natural Linen blend for superior breathability.
• Flattering relaxed fit with half-sleeves and natural mother-of-pearl buttons.
• Pre-washed fabric resists shrinkage and stays soft against sensitive skin.
• Versatile staple for office casual, weekend coffee, or seaside vacations.`,

    categoryName: "Áo nữ",
    primaryImage: "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800&auto=format&fit=crop&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1604014237800-1c9102c219da?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1551803091-e20673f15770?w=800&auto=format&fit=crop&q=80"
    ],
    
    // Ảnh mô tả dài (Detail Description Images)
    detailImages: [
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&auto=format&fit=crop&q=80"
    ],

    // Video sản phẩm 1688 thực tế
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    videoPosterUrl: "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800&auto=format&fit=crop&q=80",

    // Thuộc tính chi tiết Song ngữ
    attributes: [
      { keyCN: "材质", valueCN: "棉麻", keyVI: "Chất liệu", valueVI: "Cotton Linen Tự Nhiên", keyEN: "Material", valueEN: "Cotton Linen Blend" },
      { keyCN: "领型", valueCN: "V字领", keyVI: "Kiểu cổ", valueVI: "Cổ Chữ V", keyEN: "Collar Type", valueEN: "V-Neck" },
      { keyCN: "版型", valueCN: "宽松型", keyVI: "Phom dáng", valueVI: "Form Rộng Oversized", keyEN: "Fit Type", valueEN: "Loose / Oversized" },
      { keyCN: "季节", valueCN: "夏季", keyVI: "Mùa thích hợp", valueVI: "Mùa Hè", keyEN: "Season", valueEN: "Summer" },
      { keyCN: "产地", valueCN: "广州", keyVI: "Xuất xứ", valueVI: "Quảng Châu", keyEN: "Origin", valueEN: "Guangzhou, China" }
    ],

    // Bảng giá sỉ bậc thang 1688
    priceTiers: [
      { minQuantity: 2, priceCNY: 34.0, priceVND: 189000, priceUSD: 7.99 },
      { minQuantity: 20, priceCNY: 30.5, priceVND: 169000, priceUSD: 6.99 },
      { minQuantity: 100, priceCNY: 26.0, priceVND: 145000, priceUSD: 5.99 }
    ],

    status: "PUBLISHED",
    qualityScore: 96,
    minPriceVND: 189000,
    maxPriceVND: 219000,
    isTitleLocked: true,
    isDescLocked: true,
    isImagesLocked: false,
    isPriceAutoSync: true,
    isStockAutoSync: true,
    variants: [
      {
        sourceSkuId: "sku_7154_trang_s",
        colorName: "Trắng Kem (米白)",
        colorNameEN: "Off-White",
        sizeName: "S (42-48kg)",
        sizeNameEN: "S",
        costPriceVND: 82000,
        sellingPriceVND: 189000,
        stockQuantity: 120,
        imageUrl: "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=200&auto=format&fit=crop&q=80",
        sourceAvailable: true,
        selectedForSale: true
      },
      {
        sourceSkuId: "sku_7154_trang_m",
        colorName: "Trắng Kem (米白)",
        colorNameEN: "Off-White",
        sizeName: "M (49-55kg)",
        sizeNameEN: "M",
        costPriceVND: 82000,
        sellingPriceVND: 189000,
        stockQuantity: 150,
        imageUrl: "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=200&auto=format&fit=crop&q=80",
        sourceAvailable: true,
        selectedForSale: true
      },
      {
        sourceSkuId: "sku_7154_xanh_s",
        colorName: "Xanh Matcha (抹茶绿)",
        colorNameEN: "Matcha Green",
        sizeName: "S (42-48kg)",
        sizeNameEN: "S",
        costPriceVND: 89000,
        sellingPriceVND: 209000,
        stockQuantity: 95,
        imageUrl: "https://images.unsplash.com/photo-1604014237800-1c9102c219da?w=200&auto=format&fit=crop&q=80",
        sourceAvailable: true,
        selectedForSale: true
      }
    ],
    sourceProductId: "715421588882",
    sourceUrl: "https://detail.1688.com/offer/715421588882.html",
    supplierName: "Xưởng May Thời Trang Quảng Châu Ánh Dương",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: "prod_1688_689124451203",
    slug: "quan-ong-rong-suong-lung-cao-hack-dang-6891",
    skuCode: "SP-QOR-02",
    titleVI: "Quần Ống Rộng Nữ Suông Lưng Cao Hack Dáng Vải Tuyết Mưa Cao Cấp",
    titleVariants: {
      original: "秋季高腰垂感阔腿裤女宽松显瘦西装直筒休闲裤",
      clean: "Quần Ống Rộng Nữ Suông Lưng Cao Hack Dáng Vải Tuyết Mưa Cao Cấp",
      literal: "Quần tây nữ ống rộng cạp cao tôn dáng chất vải tuyết mưa",
      seo: "Quần Tây Nữ Ống Rộng Cạp Cao Đi Làm Tôn Dáng Chuẩn Đẹp",
      display: "Quần Ống Rộng Nữ Suông Lưng Cao Hack Dáng Vải Tuyết Mưa Cao Cấp"
    },
    shortDescVI: "Chất tuyết mưa dày dặn đứng form, cạp cao tôn dáng đôi chân thon dài hoàn hảo.",
    fullDescVI: `<p>Quần ống rộng lưng cao chất tuyết mưa đứng dáng, cạp cao hack chiều cao cực đỉnh.</p>`,

    titleEN: "Women's High Waisted Wide Leg Trousers Drape Suit Pants",
    titleVariantsEN: {
      original: "秋季高腰垂感阔腿裤女宽松显瘦西装直筒休闲裤",
      clean: "Women's High Waisted Wide Leg Drape Trousers",
      literal: "Autumn high waist drape wide leg pants women loose slimming suit straight casual trousers",
      seo: "Women's High Rise Wide Leg Trousers Professional Office Work Pants",
      display: "Women's High Waisted Wide Leg Trousers (Best Seller)"
    },
    shortDescEN: "Flowing drape fabric with tailored high-rise waistline for an elegant elongating silhouette.",
    fullDescEN: `<p>These high-waisted wide leg trousers deliver an effortless tailored fit suitable for corporate meetings or polished streetwear.</p>`,

    categoryName: "Quần nữ",
    primaryImage: "https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?w=800&auto=format&fit=crop&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop&q=80"
    ],
    detailImages: [
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80"
    ],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    videoPosterUrl: "https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?w=800&auto=format&fit=crop&q=80",

    attributes: [
      { keyCN: "材质", valueCN: "聚酯纤维", keyVI: "Chất liệu", valueVI: "Vải Tuyết Mưa Cao Cấp", keyEN: "Material", valueEN: "Drape Polyester Blend" },
      { keyCN: "裤长", valueCN: "长裤", keyVI: "Chiều dài", valueVI: "Quần Dài", keyEN: "Length", valueEN: "Full Length" },
      { keyCN: "腰型", valueCN: "高腰", keyVI: "Lưng quần", valueVI: "Cạp Cao Tôn Dáng", keyEN: "Waist Type", valueEN: "High Rise" }
    ],
    priceTiers: [
      { minQuantity: 2, priceCNY: 42.0, priceVND: 229000, priceUSD: 9.99 },
      { minQuantity: 30, priceCNY: 38.0, priceVND: 209000, priceUSD: 8.99 },
      { minQuantity: 100, priceCNY: 33.0, priceVND: 185000, priceUSD: 7.99 }
    ],

    status: "PUBLISHED",
    qualityScore: 92,
    minPriceVND: 229000,
    maxPriceVND: 259000,
    isTitleLocked: false,
    isDescLocked: false,
    isImagesLocked: false,
    isPriceAutoSync: true,
    isStockAutoSync: true,
    variants: [
      {
        sourceSkuId: "sku_6891_den_s",
        colorName: "Đen Basic (黑色)",
        colorNameEN: "Classic Black",
        sizeName: "S",
        sizeNameEN: "S",
        costPriceVND: 95000,
        sellingPriceVND: 229000,
        stockQuantity: 210,
        imageUrl: "https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?w=200&auto=format&fit=crop&q=80",
        sourceAvailable: true,
        selectedForSale: true
      },
      {
        sourceSkuId: "sku_6891_be_s",
        colorName: "Nâu Be (卡其色)",
        colorNameEN: "Beige Khaki",
        sizeName: "S",
        sizeNameEN: "S",
        costPriceVND: 105000,
        sellingPriceVND: 249000,
        stockQuantity: 75,
        imageUrl: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=200&auto=format&fit=crop&q=80",
        sourceAvailable: true,
        selectedForSale: true
      }
    ],
    sourceProductId: "689124451203",
    sourceUrl: "https://detail.1688.com/offer/689124451203.html",
    supplierName: "Nhà Máy Dệt May Hàng Châu Kim Đỉnh",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString()
  },
  {
    id: "prod_1688_744219082341",
    slug: "dam-hoa-nhi-vintage-tay-phong-co-vuong-7442",
    skuCode: "SP-DHN-03",
    titleVI: "Đầm Hoa Nhí Vintage Dáng Xòe Tay Phồng Cổ Vuông Tiểu Thư",
    titleVariants: {
      original: "法式复古小碎花连衣裙女夏方领泡泡袖甜美仙女裙",
      clean: "Đầm Hoa Nhí Vintage Dáng Xòe Tay Phồng Cổ Vuông Tiểu Thư",
      literal: "Váy hoa nhỏ kiểu Pháp dáng chữ A cổ vuông phong cách tiểu thư",
      seo: "Váy Hoa Nhí Vintage Dáng Xòe Dễ Thương Phong Cách Hàn Quốc",
      display: "Đầm Hoa Nhí Vintage Dáng Xòe Tay Phồng Cổ Vuông Tiểu Thư"
    },
    shortDescVI: "Họa tiết hoa nhí tinh tế, dáng xòe tiểu thư duyên dáng, lót lụa 2 lớp cao cấp.",
    fullDescVI: `<p>Chiếc đầm hoa nhí xinh xắn dành riêng cho các buổi hẹn hò hoặc dạo phố cuối tuần...</p>`,

    titleEN: "French Floral Vintage Puff Sleeve Square Neck Midi Dress",
    titleVariantsEN: {
      original: "法式复古小碎花连衣裙女夏方领泡泡袖甜美仙女裙",
      clean: "French Floral Vintage Square Neck Puff Sleeve Dress",
      literal: "French retro small floral dress women summer square collar puff sleeve sweet fairy skirt",
      seo: "Women's Vintage Floral Puff Sleeve Square Neck Cottagecore Midi Dress",
      display: "French Floral Vintage Puff Sleeve Midi Dress (2026 Edition)"
    },
    shortDescEN: "Charming floral chiffon print with romantic puff sleeves, ruffled hemline, and breathable inner lining.",
    fullDescEN: `<p>A romantic vintage dress inspired by French countryside fashion with flattering square neckline and delicate floral patterns.</p>`,

    categoryName: "Đầm & Váy",
    primaryImage: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&auto=format&fit=crop&q=80"
    ],
    detailImages: [
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&auto=format&fit=crop&q=80"
    ],
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    videoPosterUrl: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80",

    attributes: [
      { keyCN: "材质", valueCN: "雪纺", keyVI: "Chất liệu", valueVI: "Voan Chiffon Lụa Mềm", keyEN: "Material", valueEN: "Soft Chiffon Silk" },
      { keyCN: "裙长", valueCN: "中长裙", keyVI: "Độ dài", valueVI: "Váy Midi Dài Quá Gối", keyEN: "Length", valueEN: "Midi Length" },
      { keyCN: "领型", valueCN: "方领", keyVI: "Kiểu cổ", valueVI: "Cổ Vuông Kiểu Pháp", keyEN: "Collar Type", valueEN: "Square Neck" }
    ],
    priceTiers: [
      { minQuantity: 2, priceCNY: 48.0, priceVND: 289000, priceUSD: 12.99 },
      { minQuantity: 20, priceCNY: 43.0, priceVND: 259000, priceUSD: 11.50 },
      { minQuantity: 50, priceCNY: 38.0, priceVND: 229000, priceUSD: 9.99 }
    ],

    status: "DRAFT",
    qualityScore: 89,
    minPriceVND: 289000,
    maxPriceVND: 319000,
    isTitleLocked: false,
    isDescLocked: false,
    isImagesLocked: false,
    isPriceAutoSync: true,
    isStockAutoSync: true,
    variants: [
      {
        sourceSkuId: "sku_7442_hoa_vang_s",
        colorName: "Vàng Hoa Cúc (小黄花)",
        colorNameEN: "Daisy Yellow",
        sizeName: "S",
        sizeNameEN: "S",
        costPriceVND: 120000,
        sellingPriceVND: 289000,
        stockQuantity: 40,
        imageUrl: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=200&auto=format&fit=crop&q=80",
        sourceAvailable: true,
        selectedForSale: true
      },
      {
        sourceSkuId: "sku_7442_hoa_xanh_m",
        colorName: "Xanh Hoa Nhí (碎花蓝)",
        colorNameEN: "Floral Blue",
        sizeName: "M",
        sizeNameEN: "M",
        costPriceVND: 125000,
        sellingPriceVND: 299000,
        stockQuantity: 35,
        imageUrl: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=200&auto=format&fit=crop&q=80",
        sourceAvailable: true,
        selectedForSale: true
      }
    ],
    sourceProductId: "744219082341",
    sourceUrl: "https://detail.1688.com/offer/744219082341.html",
    supplierName: "Xưởng Thiết Kế Thời Trang Y Mộng",
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "prod_1688_690184712093",
    slug: "tui-xach-nu-kep-nach-da-pu-retro-khoa-kim-loai-6901",
    skuCode: "SP-TXN-04",
    titleVI: "Túi Xách Nữ Kẹp Nách Da PU Phong Cách Retro Khóa Kim Loại Sang Trọng",
    titleVariants: {
      original: "复古PU皮腋下包女小众设计法式金属锁扣单肩包",
      clean: "Túi Xách Nữ Kẹp Nách Da PU Phong Cách Retro Khóa Kim Loại Sang Trọng",
      literal: "Túi đeo vai nữ da PU cổ điển khóa kim loại phong cách Pháp",
      seo: "Túi Xách Nữ Kẹp Nách Da PU Cao Cấp Phong Cách Retro Sang Chảnh",
      display: "Túi Xách Nữ Kẹp Nách Da PU Phong Cách Retro Khóa Kim Loại Sang Trọng"
    },
    shortDescVI: "Chất da PU bóng mờ cao cấp, form chuẩn không gãy gập, khóa đồng vintage.",
    fullDescVI: `<p>Mẫu túi kẹp nách thời thượng làm mưa làm gió trên các sàn thương mại điện tử...</p>`,

    titleEN: "Women's Retro PU Leather Shoulder Underarm Bag Metal Lock Handbag",
    titleVariantsEN: {
      original: "复古PU皮腋下包女小众设计法式金属锁扣单肩包",
      clean: "Women's Retro PU Leather Shoulder Bag Metal Lock",
      literal: "Retro PU leather underarm bag women niche design French metal lock shoulder bag",
      seo: "Vintage PU Leather Baguette Bag Women Retro Minimalist Clutch Purse",
      display: "Women's Retro PU Leather Underarm Bag (Trending 2026)"
    },
    shortDescEN: "Sleek faux leather baguette bag with polished gold-tone hardware and secure magnetic closure.",
    fullDescEN: `<p>A sleek 90s-inspired baguette bag crafted in premium soft faux leather with interior zippered pockets.</p>`,

    categoryName: "Phụ kiện",
    primaryImage: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80",
    galleryImages: [
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&auto=format&fit=crop&q=80"
    ],
    detailImages: [
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&auto=format&fit=crop&q=80"
    ],
    videoUrl: null, // Sản phẩm này không có video

    attributes: [
      { keyCN: "材质", valueCN: "PU皮", keyVI: "Chất liệu", valueVI: "Da PU Cao Cấp Chống Trầy", keyEN: "Material", valueEN: "Premium PU Vegan Leather" },
      { keyCN: "开盖方式", valueCN: "锁扣", keyVI: "Kiểu khóa", valueVI: "Khóa Kim Loại Vintage", keyEN: "Closure Type", valueEN: "Vintage Metal Lock" }
    ],
    priceTiers: [
      { minQuantity: 2, priceCNY: 28.0, priceVND: 159000, priceUSD: 6.99 },
      { minQuantity: 50, priceCNY: 24.0, priceVND: 139000, priceUSD: 5.99 },
      { minQuantity: 200, priceCNY: 20.0, priceVND: 119000, priceUSD: 4.99 }
    ],

    status: "DRAFT",
    qualityScore: 82,
    minPriceVND: 159000,
    maxPriceVND: 179000,
    isTitleLocked: false,
    isDescLocked: false,
    isImagesLocked: false,
    isPriceAutoSync: true,
    isStockAutoSync: false,
    variants: [
      {
        sourceSkuId: "sku_6901_nau_tay",
        colorName: "Nâu Tây (复古棕)",
        colorNameEN: "Retro Brown",
        sizeName: "Tiêu chuẩn (24x14cm)",
        sizeNameEN: "Standard (24x14cm)",
        costPriceVND: 65000,
        sellingPriceVND: 159000,
        stockQuantity: 90,
        imageUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200&auto=format&fit=crop&q=80",
        sourceAvailable: true,
        selectedForSale: true
      }
    ],
    sourceProductId: "690184712093",
    sourceUrl: "https://detail.1688.com/offer/690184712093.html",
    supplierName: "Xưởng Đồ Da & Phụ Kiện Bạch Vân Quảng Châu",
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 18).toISOString()
  }
];

export const SEED_PRODUCTS: WebProduct[] = RAW_SEED_PRODUCTS.map(enrichSeedWithSEO);

export const SEED_DIFF_LOGS: ProductDiffSummary[] = [
  {
    webProductId: "prod_1688_690184712093",
    sourceProductId: "690184712093",
    productTitle: "Túi Xách Nữ Kẹp Nách Da PU Phong Cách Retro",
    detectedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    hasPriceChange: true,
    hasStockChange: true,
    hasUnavailableSku: true,
    requiresReview: true,
    changes: [
      {
        fieldName: "variants",
        oldValue: "Tồn kho Đen Tuyền: 80 sp",
        newValue: "Tồn kho Đen Tuyền: 0 sp (Hết hàng tại xưởng TQ)",
        severity: "CRITICAL",
        autoApplied: false
      },
      {
        fieldName: "price",
        oldValue: 18.0,
        newValue: 21.5,
        deltaPercent: 19.4,
        severity: "WARNING",
        autoApplied: false
      }
    ]
  },
  {
    webProductId: "prod_1688_744219082341",
    sourceProductId: "744219082341",
    productTitle: "Đầm Hoa Nhí Vintage Dáng Xòe Tay Phồng",
    detectedAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    hasPriceChange: true,
    hasStockChange: false,
    hasUnavailableSku: false,
    requiresReview: false,
    changes: [
      {
        fieldName: "price",
        oldValue: 32.0,
        newValue: 28.5,
        deltaPercent: -10.9,
        severity: "INFO",
        autoApplied: true
      }
    ]
  }
];
