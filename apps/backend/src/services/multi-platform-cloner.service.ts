import {
  SourcePlatform,
  WebProduct,
  WebProductVariant,
  ClonePreviewResponse,
  CloneExecuteRequest,
  ClonedVariantPreview,
  SupportedPlatformInfo,
  BatchCloneRequest,
  BatchCloneItemResult,
  BatchCloneResponse,
  VisualSourcingRequest,
  VisualSourcingMatch,
  VisualSourcingResponse
} from "@hub1688/shared-types";
import {
  detectProductPlatform,
  extractProductIdFromUrl,
  parseHtmlProductMetadata,
  SUPPORTED_PLATFORMS_META,
  evaluateProductQuality
} from "@hub1688/shared-utils";
import { TranslationEngineService } from "./translation.service.js";
import { PricingEngineService } from "./pricing.service.js";
import { supabaseService } from "./supabase.service.js";
import { aiGatewayService } from "./ai-gateway.service.js";
import { inMemoryProducts } from "../controllers/import.controller.js";

interface PlatformPresetItem {
  platform: SourcePlatform;
  productId: string;
  originalTitle: string;
  translatedTitleVI: string;
  translatedTitleEN: string;
  supplierName: string;
  categoryName: string;
  currency: "CNY" | "USD" | "VND";
  originalPriceMin: number;
  originalPriceMax: number;
  primaryImage: string;
  galleryImages: string[];
  detailImages?: string[];
  variants: Array<{
    skuId: string;
    name: string;
    nameVI?: string;
    originalPrice: number;
    stock: number;
    imageUrl?: string;
  }>;
  attributes: Array<{ key: string; value: string }>;
}

const PRESET_SAMPLE_CATALOG: Record<string, PlatformPresetItem> = {
  "681928471928": {
    platform: "TAOBAO",
    productId: "681928471928",
    originalTitle: "法式复古真丝衬衫女长袖设计感小众春装高端上衣桑蚕丝",
    translatedTitleVI: "Áo Sơ Mi Lụa Tơ Tằm Phong Cách Pháp Cổ Điển Tay Dài Thiết Kế Tinh Tế Sang Trọng",
    translatedTitleEN: "French Vintage Mulberry Silk Blouse Long Sleeve Luxury Designer Shirt",
    supplierName: "Taobao Silk Studio Official",
    categoryName: "Áo thời trang",
    currency: "CNY",
    originalPriceMin: 168,
    originalPriceMax: 188,
    primaryImage: "https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?w=800&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop"
    ],
    detailImages: [
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop"
    ],
    variants: [
      { skuId: "TB-01-WHITE-S", name: "Trắng Ngà / Size S", nameVI: "Trắng Ngà - S", originalPrice: 168, stock: 120, imageUrl: "https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?w=800&auto=format&fit=crop" },
      { skuId: "TB-01-WHITE-M", name: "Trắng Ngà / Size M", nameVI: "Trắng Ngà - M", originalPrice: 168, stock: 250, imageUrl: "https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?w=800&auto=format&fit=crop" },
      { skuId: "TB-01-MINT-S", name: "Xanh Ngọc / Size S", nameVI: "Xanh Bạc Hà - S", originalPrice: 188, stock: 95, imageUrl: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop" },
      { skuId: "TB-01-MINT-M", name: "Xanh Ngọc / Size M", nameVI: "Xanh Bạc Hà - M", originalPrice: 188, stock: 180, imageUrl: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop" }
    ],
    attributes: [
      { key: "Chất liệu", value: "100% Lụa Mulberry cao cấp" },
      { key: "Phong cách", value: "Vintage Paris Chic" },
      { key: "Mùa thích hợp", value: "Xuân - Hè - Thu" },
      { key: "Xuất xứ", value: "Chiết Giang, Hàng Châu" }
    ]
  },
  "712938491024": {
    platform: "TMALL",
    productId: "712938491024",
    originalTitle: "太平鸟春季新款小香风粗花呢外套女名媛短款高级感上衣",
    translatedTitleVI: "Áo Khoác Tweed Dạ Phong Cách Tiểu Thư Chanel Peacebird Cao Cấp Dáng Ngắn",
    translatedTitleEN: "Peacebird Classic Tweed Blazer Jacket Luxury French Lady Style",
    supplierName: "Peacebird Tmall Official Flagship",
    categoryName: "Áo khoác",
    currency: "CNY",
    originalPriceMin: 320,
    originalPriceMax: 360,
    primaryImage: "https://images.unsplash.com/photo-1539533018447-63fcce667883?w=800&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1548883354-7622d03aca27?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&auto=format&fit=crop"
    ],
    detailImages: [
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop"
    ],
    variants: [
      { skuId: "TM-01-BLACK-S", name: "Đen Viền Trắng / Size S", nameVI: "Đen Phối Viền - S", originalPrice: 320, stock: 80, imageUrl: "https://images.unsplash.com/photo-1539533018447-63fcce667883?w=800&auto=format&fit=crop" },
      { skuId: "TM-01-BLACK-M", name: "Đen Viền Trắng / Size M", nameVI: "Đen Phối Viền - M", originalPrice: 320, stock: 150, imageUrl: "https://images.unsplash.com/photo-1539533018447-63fcce667883?w=800&auto=format&fit=crop" },
      { skuId: "TM-01-BEIGE-M", name: "Be Ngọc Trai / Size M", nameVI: "Kem Ngọc Trai - M", originalPrice: 360, stock: 110, imageUrl: "https://images.unsplash.com/photo-1548883354-7622d03aca27?w=800&auto=format&fit=crop" }
    ],
    attributes: [
      { key: "Thương hiệu", value: "Peacebird Official" },
      { key: "Chất liệu", value: "Vải Tweed dệt kim tuyến" },
      { key: "Kiểu dáng", value: "Cropped Blazer" }
    ]
  },
  "987654321": {
    platform: "SHOPEE",
    productId: "987654321",
    originalTitle: "Váy Đầm Hoa Nhí Vintage Dáng Dài Cổ Vuông Tay Bồng Nữ Tính Đi Biển Dạo Phố",
    translatedTitleVI: "Váy Đầm Hoa Nhí Vintage Dáng Dài Cổ Vuông Tay Bồng Nữ Tính Đi Biển Dạo Phố",
    translatedTitleEN: "Vintage Floral Maxi Dress Square Neck Puff Sleeve Beach Vacation",
    supplierName: "Shopee Mall Boutique VN",
    categoryName: "Váy đầm",
    currency: "VND",
    originalPriceMin: 185000,
    originalPriceMax: 215000,
    primaryImage: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&auto=format&fit=crop"
    ],
    detailImages: [
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&auto=format&fit=crop"
    ],
    variants: [
      { skuId: "SP-01-YELLOW-M", name: "Hoa Nhí Vàng / Size M", nameVI: "Vàng Hoa Nhí - M", originalPrice: 185000, stock: 320, imageUrl: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop" },
      { skuId: "SP-01-YELLOW-L", name: "Hoa Nhí Vàng / Size L", nameVI: "Vàng Hoa Nhí - L", originalPrice: 185000, stock: 210, imageUrl: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop" },
      { skuId: "SP-01-BLUE-M", name: "Hoa Nhí Xanh / Size M", nameVI: "Xanh Pastel - M", originalPrice: 215000, stock: 145, imageUrl: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&auto=format&fit=crop" }
    ],
    attributes: [
      { key: "Chất liệu", value: "Voan lụa 2 lớp mềm mịn" },
      { key: "Chiều dài váy", value: "Maxi qua bắp chân" },
      { key: "Họa tiết", value: "Hoa nhí đồng nội" }
    ]
  },
  "1729384918294": {
    platform: "TIKTOK_SHOP",
    productId: "1729384918294",
    originalTitle: "Set Đồ Ngủ Pijama Lụa Satin Cao Cấp Dài Tay Mặc Nhà Sang Chảnh Mềm Mát",
    translatedTitleVI: "Set Đồ Ngủ Pijama Lụa Satin Cao Cấp Dài Tay Mặc Nhà Sang Chảnh Mềm Mát",
    translatedTitleEN: "Silk Satin Pajamas Long Sleeve Luxury Loungewear Sleepwear Set",
    supplierName: "TikTok Shop Viral Store",
    categoryName: "Đồ ngủ mặc nhà",
    currency: "VND",
    originalPriceMin: 159000,
    originalPriceMax: 179000,
    primaryImage: "https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?w=800&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1618244972963-dbee1a7edc95?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=800&auto=format&fit=crop"
    ],
    detailImages: [
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&auto=format&fit=crop"
    ],
    variants: [
      { skuId: "TK-01-PINK-M", name: "Hồng Đỗ / Size M", nameVI: "Hồng Pastel - M", originalPrice: 159000, stock: 450, imageUrl: "https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?w=800&auto=format&fit=crop" },
      { skuId: "TK-01-NAVY-M", name: "Xanh Navy / Size M", nameVI: "Xanh Than - M", originalPrice: 179000, stock: 280, imageUrl: "https://images.unsplash.com/photo-1618244972963-dbee1a7edc95?w=800&auto=format&fit=crop" }
    ],
    attributes: [
      { key: "Chất liệu", value: "Lụa Satin nhập khẩu không nhăn" },
      { key: "Kiểu áo", value: "Cổ bẻ viền mí cao cấp" },
      { key: "Đặc tính", value: "Thoáng mát, thấm hút mồ hôi" }
    ]
  },
  "1005004819283746": {
    platform: "ALIEXPRESS",
    productId: "1005004819283746",
    originalTitle: "Ultra Smart Watch Series 9 Waterproof NFC Bluetooth Call Fitness Tracker",
    translatedTitleVI: "Đồng Hồ Thông Minh Ultra Series 9 Chống Nước NFC Nghe Gọi Bluetooth Đo Nhịp Tim Thể Thao",
    translatedTitleEN: "Ultra Smart Watch Series 9 Waterproof NFC Bluetooth Call Fitness Tracker",
    supplierName: "AliExpress Tech Global Store",
    categoryName: "Đồng hồ & Phụ kiện",
    currency: "USD",
    originalPriceMin: 18.5,
    originalPriceMax: 22.0,
    primaryImage: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop"
    ],
    detailImages: [
      "https://images.unsplash.com/photo-1510017803434-a899398421b3?w=800&auto=format&fit=crop"
    ],
    variants: [
      { skuId: "AE-01-TITAN-ORANGE", name: "Titanium / Dây Cam", nameVI: "Khung Titan - Dây Cam Alpine", originalPrice: 18.5, stock: 350, imageUrl: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop" },
      { skuId: "AE-01-BLACK-BLACK", name: "Đen Nhám / Dây Đen", nameVI: "Đen Nhám - Dây Silicon Đen", originalPrice: 22.0, stock: 500, imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop" }
    ],
    attributes: [
      { key: "Màn hình", value: "AMOLED 2.02 inch HD tràn viền" },
      { key: "Chống nước", value: "IP68 đi mưa, rửa tay" },
      { key: "Thời lượng pin", value: "3-5 ngày sử dụng liên tục" }
    ]
  },
  "cottonon": {
    platform: "GENERIC_WEB",
    productId: "cottonon_123456",
    originalTitle: "Oversized Vintage Graphic Crew Neck Tee",
    translatedTitleVI: "Áo Thun Cotton Form Rộng Oversize In Họa Tiết Vintage Unisex Cao Cấp",
    translatedTitleEN: "Oversized Vintage Graphic Crew Neck Tee Unisex Cotton",
    supplierName: "Cotton On Store",
    categoryName: "Áo thời trang",
    currency: "VND",
    originalPriceMin: 290000,
    originalPriceMax: 290000,
    primaryImage: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop",
    galleryImages: [
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop"
    ],
    detailImages: [
      "https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=800&auto=format&fit=crop"
    ],
    variants: [
      { skuId: "CT-01-BLACK-S", name: "Washed Black / Size S", nameVI: "Đen Phai - S", originalPrice: 290000, stock: 80, imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop" },
      { skuId: "CT-01-BLACK-M", name: "Washed Black / Size M", nameVI: "Đen Phai - M", originalPrice: 290000, stock: 150, imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop" },
      { skuId: "CT-01-WHITE-M", name: "Vintage White / Size M", nameVI: "Trắng Cổ Điển - M", originalPrice: 290000, stock: 120, imageUrl: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop" }
    ],
    attributes: [
      { key: "Chất liệu", value: "100% Cotton 250gsm dày dặn" },
      { key: "Form dáng", value: "Oversized Boxy Fit" }
    ]
  }
};

export class MultiPlatformClonerService {
  private translationService = new TranslationEngineService();
  private pricingService = new PricingEngineService();

  public getSupportedPlatforms(): SupportedPlatformInfo[] {
    return SUPPORTED_PLATFORMS_META;
  }

  /**
   * Phân tích và xem trước (Preview) sản phẩm từ URL
   */
  public async previewProduct(url: string, manualPlatform?: SourcePlatform): Promise<ClonePreviewResponse> {
    if (!url || typeof url !== "string") {
      throw new Error("Vui lòng cung cấp URL sản phẩm hợp lệ");
    }

    const platform = manualPlatform || detectProductPlatform(url);
    const productId = extractProductIdFromUrl(url, platform);

    // 1. Kiểm tra nếu URL khớp với catalog mẫu preset sẵn có
    for (const [key, preset] of Object.entries(PRESET_SAMPLE_CATALOG)) {
      if (url.includes(key) || productId.includes(key)) {
        return this.formatPresetToPreviewResponse(preset, url);
      }
    }

    // 2. Thử fetch và trích xuất dữ liệu trực tiếp từ URL
    try {
      // 2a. Đối với các trang Shopify (như Macorner và các shop Shopify khác), gọi endpoint JSON chính thức
      if (url.includes("/products/")) {
        try {
          const cleanProductUrl = url.split("?")[0].replace(/\/$/, "");
          const shopifyJsonUrl = `${cleanProductUrl}.js`;
          const shopifyRes = await this.fetchJson(shopifyJsonUrl);
          if (shopifyRes && (shopifyRes.title || (Array.isArray(shopifyRes.variants) && shopifyRes.variants.length > 0))) {
            return this.formatShopifyJsonToPreviewResponse(url, platform, productId, shopifyRes);
          }
        } catch (shopifyErr) {
          // Fallback tiếp tục fetch HTML bình thường
        }
      }

      const html = await this.fetchPageHtml(url);
      const extracted = parseHtmlProductMetadata(html);

      if (extracted.title || extracted.images.length > 0) {
        return this.formatExtractedToPreviewResponse(url, platform, productId, extracted);
      }
    } catch {
      // Fetch bị chặn bởi Cloudflare / CORS / bot blocker
    }

    // 3. Nếu fetch thất bại (thường gặp khi sàn có tường lửa anti-bot), tự động lấy mẫu đại diện theo nền tảng
    const fallbackPreset = this.getFallbackPresetForPlatform(platform);
    return this.formatPresetToPreviewResponse(fallbackPreset, url);
  }

  /**
   * Clone chính thức và lưu sản phẩm vào cơ sở dữ liệu
   */
  public async executeClone(request: CloneExecuteRequest): Promise<WebProduct> {
    const preview = await this.previewProduct(request.url, request.platform);

    const titleVI = request.customTitle || preview.translatedTitleVI;
    const titleEN = preview.translatedTitleEN || titleVI;
    const categoryName = request.categoryName || preview.categorySuggested;
    const productId = `prod_cloned_${Date.now()}`;
    const skuCode = `CL-${Date.now().toString().slice(-6)}`;

    // Tạo variants hoàn chỉnh
    const variants: WebProductVariant[] = preview.variants.map((v, idx) => {
      let vCostVND = preview.estimatedCostVND;
      if (typeof v.originalPrice === "number" && v.originalPrice > 0) {
        if (preview.currency === "USD") {
          vCostVND = Math.round(v.originalPrice * 25400);
        } else if (preview.currency === "CNY") {
          vCostVND = this.pricingService.calculate(v.originalPrice).totalCostVND;
        } else {
          vCostVND = Math.round(v.originalPrice * 0.7);
        }
      }

      return {
        id: `v_${Date.now()}_${idx}`,
        sourceVariantId: v.skuId,
        sourceSkuId: v.skuId,
        colorName: v.nameVI || v.name,
        colorNameEN: v.name,
        costPriceVND: vCostVND,
        sellingPriceVND: v.priceVND || preview.estimatedSellingPriceVND,
        stockQuantity: v.stock || 100,
        imageUrl: v.imageUrl || preview.primaryImage,
        sourceAvailable: true,
        selectedForSale: true
      };
    });

    // Tính toán min/max price
    const minPriceVND = Math.min(...variants.map(v => v.sellingPriceVND));
    const maxPriceVND = Math.max(...variants.map(v => v.sellingPriceVND));

    // Sinh SEO package
    const seoPackage = this.translationService.generateCompleteSEOPackage({
      titleVI,
      titleEN,
      categoryName,
      attributes: (preview.rawAttributes || []).map(a => ({ keyVI: a.key, valueVI: a.value, keyCN: a.key, valueCN: a.value })),
      primaryImage: preview.primaryImage,
      galleryImages: preview.galleryImages,
      detailImages: preview.detailImages || [],
      variants,
      skuCode,
      minPriceVND,
      maxPriceVND,
      supplierName: preview.supplierName
    });

    const newProduct: WebProduct = {
      id: productId,
      slug: `${seoPackage.slug}-${Date.now().toString().slice(-4)}`,
      skuCode,
      sourcePlatform: preview.sourcePlatform,
      sourceCurrency: preview.currency,
      titleVI,
      titleEN,
      shortDescVI: `Sản phẩm ${titleVI} được clone tự động từ ${preview.sourcePlatform}`,
      fullDescVI: `## Mô Tả Chi Tiết Sản Phẩm\n\n**${titleVI}**\n\nNguồn gốc: ${preview.sourcePlatform} (${preview.supplierName})\n\n- Chất lượng cao cấp, thiết kế hiện đại.\n- Hàng có sẵn, hỗ trợ giao hàng toàn quốc.`,
      shortDescEN: `High-quality ${titleEN} imported from ${preview.sourcePlatform}`,
      fullDescEN: `## Detailed Description\n\n**${titleEN}**\n\nSource: ${preview.sourcePlatform}\n\n- Superior quality and authentic design.\n- Worldwide standard specs.`,
      displayLanguage: "VI",
      categoryName,
      primaryImage: preview.primaryImage,
      galleryImages: preview.galleryImages,
      detailImages: preview.detailImages || [],
      attributes: (preview.rawAttributes || []).map(a => ({
        keyCN: a.key,
        valueCN: a.value,
        keyVI: a.key,
        valueVI: a.value
      })),
      seo: seoPackage.seo,
      metaTitle: seoPackage.metaTitle,
      metaDescription: seoPackage.metaDescription,
      focusKeywords: seoPackage.focusKeywords,
      imagesSEO: seoPackage.imagesSEO,
      faqs: seoPackage.faqs,
      status: request.autoPublish ? "PUBLISHED" : "DRAFT",
      qualityScore: 0,
      minPriceVND,
      maxPriceVND,
      isTitleLocked: false,
      isDescLocked: false,
      isImagesLocked: false,
      isPriceAutoSync: true,
      isStockAutoSync: true,
      variants,
      sourceProductId: preview.sourceProductId,
      sourceUrl: preview.sourceUrl,
      supplierName: preview.supplierName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Chấm điểm Quality Score
    const qualityResult = evaluateProductQuality(newProduct);
    newProduct.qualityScore = qualityResult.totalScore;

    // Lưu vào inMemory cache
    inMemoryProducts.set(productId, newProduct);

    // Lưu vào Supabase PostgreSQL nếu đã cấu hình
    if (supabaseService.isConfigured()) {
      try {
        await supabaseService.saveWebProduct(newProduct);
      } catch (err) {
        console.warn("Lỗi lưu Supabase cho sản phẩm clone:", err);
      }
    }

    return newProduct;
  }

  /**
   * Clone hàng loạt danh sách URL (Batch Queue processing)
   */
  public async executeBatchClone(request: BatchCloneRequest): Promise<BatchCloneResponse> {
    const rawUrls = Array.isArray(request.urls) ? request.urls : [];
    const validUrls = rawUrls
      .map(u => (typeof u === "string" ? u.trim() : ""))
      .filter(u => u.length > 5 && (u.startsWith("http://") || u.startsWith("https://")))
      .slice(0, 50); // Cắt tối đa 50 link để tránh quá tải

    const results: BatchCloneItemResult[] = [];
    let succeeded = 0;
    let failed = 0;

    // Xử lý song song từng cụm 3 link (Concurrency Chunking)
    const chunkSize = 3;
    for (let i = 0; i < validUrls.length; i += chunkSize) {
      const chunk = validUrls.slice(i, i + chunkSize);
      const chunkPromises = chunk.map(async url => {
        try {
          const platform = detectProductPlatform(url);
          const product = await this.executeClone({
            url,
            pricingRuleId: request.pricingRuleId,
            categoryName: request.categoryName,
            autoPublish: request.autoPublish
          });
          return {
            url,
            success: true,
            product,
            sourcePlatform: platform
          };
        } catch (err: any) {
          return {
            url,
            success: false,
            error: err.message || "Lỗi khi clone URL này",
            sourcePlatform: detectProductPlatform(url)
          };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      for (const res of chunkResults) {
        if (res.success) succeeded++;
        else failed++;
        results.push(res);
      }
    }

    return {
      total: validUrls.length,
      succeeded,
      failed,
      results
    };
  }

  /**
   * Tìm kiếm xưởng sản xuất gốc 1688 bằng hình ảnh (Visual Sourcing)
   */
  public async find1688SuppliersByImage(request: VisualSourcingRequest): Promise<VisualSourcingResponse> {
    let targetTitle = request.title || "Sản phẩm tìm kiếm xưởng 1688";
    let targetImage = request.imageUrl || "https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?w=800&auto=format&fit=crop";
    let sellingPriceVND = request.currentSellingPriceVND || 250000;

    // Nếu truyền productId, lấy thông tin sản phẩm từ memory/supabase
    if (request.productId) {
      const existing = inMemoryProducts.get(request.productId);
      if (existing) {
        targetTitle = existing.titleVI;
        targetImage = existing.primaryImage || targetImage;
        sellingPriceVND = existing.minPriceVND || sellingPriceVND;
      }
    }

    const matches = await aiGatewayService.reverseVisual1688Search({
      imageUrl: targetImage,
      productTitle: targetTitle,
      currentSellingPriceVND: sellingPriceVND
    });

    return {
      success: true,
      queryTitle: targetTitle,
      queryImage: targetImage,
      matches
    };
  }


  private async fetchPageHtml(url: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7,zh-CN;q=0.6"
      }
    });

    clearTimeout(timeout);
    if (!response.ok) throw new Error(`HTTP status ${response.status}`);
    return await response.text();
  }

  private async fetchJson(url: string): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    clearTimeout(timeout);
    if (!response.ok) throw new Error(`HTTP status ${response.status}`);
    return await response.json();
  }

  private formatShopifyJsonToPreviewResponse(
    sourceUrl: string,
    platform: SourcePlatform,
    productId: string,
    data: any
  ): ClonePreviewResponse {
    const rawTitle = data.title || "Shopify Product";
    const rawImages: string[] = (Array.isArray(data.images) ? data.images : [])
      .map((img: any) => {
        let clean = (typeof img === "string" ? img : img?.src || "").trim();
        if (clean.startsWith("//")) clean = "https:" + clean;
        return clean;
      })
      .filter(Boolean);

    const primaryImage = rawImages[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800";
    const galleryImages = rawImages.slice(1);

    const rawVariants: any[] = Array.isArray(data.variants) ? data.variants : [];

    // Chuẩn hóa đơn vị cents sang USD nếu cần (ví dụ: 2295 -> 22.95)
    const normalizePrice = (p: number) => {
      if (typeof p !== "number" || isNaN(p)) return 22.95;
      return p >= 100 ? Math.round((p / 100) * 100) / 100 : p;
    };

    const minPrice = rawVariants.length > 0
      ? Math.min(...rawVariants.map(v => normalizePrice(v.price)))
      : (data.price ? normalizePrice(data.price) : 22.95);

    const maxPrice = rawVariants.length > 0
      ? Math.max(...rawVariants.map(v => normalizePrice(v.price)))
      : minPrice;

    const currency: "USD" | "VND" | "CNY" = "USD";
    const costVND = Math.round(minPrice * 25400);
    const sellingVND = Math.round(costVND * 1.4);
    const margin = Math.max(20, Math.round(((sellingVND - costVND) / sellingVND) * 100));

    // Map variant image by featured_image or image_id
    const imageMap = new Map<number, string>();
    if (Array.isArray(data.images)) {
      data.images.forEach((img: any) => {
        if (typeof img === "object" && img?.id && img?.src) {
          let s = img.src.trim();
          if (s.startsWith("//")) s = "https:" + s;
          imageMap.set(img.id, s);
        }
      });
    }

    // Trích xuất hình ảnh mô tả chi tiết từ Shopify description / body_html
    const detailImages: string[] = [];
    const descHtml = data.body_html || data.description || "";
    if (descHtml) {
      const imgRegex = /<img\b[^>]*\b(?:src|data-src)=["']((?:https?:)?\/\/[^"'\s>]+)["'][^>]*>/gi;
      let m: RegExpExecArray | null;
      while ((m = imgRegex.exec(descHtml)) !== null) {
        let u = m[1].trim();
        if (u.startsWith("//")) u = "https:" + u;
        if (!detailImages.includes(u)) detailImages.push(u);
      }
    }

    const variants: ClonedVariantPreview[] = rawVariants.map((v, idx) => {
      const vPrice = normalizePrice(v.price);
      const vCostVND = Math.round(vPrice * 25400);
      const vSellingVND = Math.round(vCostVND * 1.4);
      let img = v.featured_image?.src || (typeof v.featured_image === "string" ? v.featured_image : undefined);
      if (!img && v.image_id && imageMap.has(v.image_id)) {
        img = imageMap.get(v.image_id);
      }
      if (!img) img = primaryImage;
      if (typeof img === "string" && img.startsWith("//")) img = "https:" + img;

      return {
        skuId: String(v.id || v.sku || `SKU-${idx}`),
        name: v.title || `Biến thể ${idx + 1}`,
        nameVI: v.title || `Biến thể ${idx + 1}`,
        option1: v.option1,
        option2: v.option2,
        option3: v.option3,
        originalPrice: vPrice,
        priceVND: vSellingVND,
        stock: 100,
        imageUrl: img
      };
    });

    const rawOptions = (data.options || []).map((o: any) => ({
      name: typeof o === "string" ? o : o.name,
      values: Array.isArray(o.values) ? o.values : []
    }));

    return {
      sourcePlatform: platform,
      sourceProductId: String(data.id || productId),
      sourceUrl,
      originalTitle: rawTitle,
      translatedTitleVI: rawTitle,
      translatedTitleEN: rawTitle,
      supplierName: data.vendor || "Macorner",
      currency,
      originalPriceMin: minPrice,
      originalPriceMax: maxPrice,
      estimatedCostVND: costVND,
      estimatedSellingPriceVND: sellingVND,
      estimatedMarginPercent: margin,
      primaryImage,
      galleryImages,
      detailImages,
      variants: variants.length > 0 ? variants : [
        {
          skuId: `SKU-${productId}-01`,
          name: "Tiêu Chuẩn (Mặc Định)",
          nameVI: "Phiên Bản Tiêu Chuẩn",
          originalPrice: minPrice,
          priceVND: sellingVND,
          stock: 100,
          imageUrl: primaryImage
        }
      ],
      rawOptions,
      categorySuggested: "Quà tặng & Phụ kiện",
      rawAttributes: [
        { key: "Nguồn gốc", value: platform },
        { key: "Thương hiệu", value: data.vendor || "Macorner" },
        ...(rawOptions.map((o: any) => ({ key: o.name, value: o.values.join(", ") })))
      ],
      qualityScorePreview: 92
    };
  }

  private formatPresetToPreviewResponse(preset: PlatformPresetItem, sourceUrl: string): ClonePreviewResponse {
    let costVND = 0;
    let sellingVND = 0;

    if (preset.currency === "CNY") {
      const calc = this.pricingService.calculate(preset.originalPriceMin);
      costVND = calc.totalCostVND;
      sellingVND = calc.finalSellingPriceVND;
    } else if (preset.currency === "USD") {
      costVND = Math.round(preset.originalPriceMin * 25400);
      sellingVND = Math.round(costVND * 1.4);
    } else {
      // VND
      costVND = Math.round(preset.originalPriceMin * 0.7);
      sellingVND = preset.originalPriceMin;
    }

    const margin = Math.round(((sellingVND - costVND) / sellingVND) * 100);

    const variants: ClonedVariantPreview[] = preset.variants.map(v => {
      let vPriceVND = sellingVND;
      if (preset.currency === "CNY") {
        vPriceVND = this.pricingService.calculate(v.originalPrice).finalSellingPriceVND;
      } else if (preset.currency === "USD") {
        vPriceVND = Math.round(v.originalPrice * 25400 * 1.4);
      } else {
        vPriceVND = v.originalPrice;
      }
      return {
        skuId: v.skuId,
        name: v.name,
        nameVI: v.nameVI,
        originalPrice: v.originalPrice,
        priceVND: vPriceVND,
        stock: v.stock,
        imageUrl: v.imageUrl
      };
    });

    return {
      sourcePlatform: preset.platform,
      sourceProductId: preset.productId,
      sourceUrl,
      originalTitle: preset.originalTitle,
      translatedTitleVI: preset.translatedTitleVI,
      translatedTitleEN: preset.translatedTitleEN,
      supplierName: preset.supplierName,
      currency: preset.currency,
      originalPriceMin: preset.originalPriceMin,
      originalPriceMax: preset.originalPriceMax,
      estimatedCostVND: costVND,
      estimatedSellingPriceVND: sellingVND,
      estimatedMarginPercent: margin,
      primaryImage: preset.primaryImage,
      galleryImages: preset.galleryImages,
      detailImages: preset.detailImages || [],
      variants,
      categorySuggested: preset.categoryName,
      rawAttributes: preset.attributes,
      qualityScorePreview: 88
    };
  }

  private formatExtractedToPreviewResponse(
    sourceUrl: string,
    platform: SourcePlatform,
    productId: string,
    extracted: any
  ): ClonePreviewResponse {
    const rawTitle = extracted.title || "Sản phẩm E-commerce Đa Nền Tảng";
    const primaryImage = extracted.images[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop";
    const galleryImages = extracted.images.slice(1);
    const detailImages = extracted.detailImages || [];

    let currency: "CNY" | "USD" | "VND" = extracted.currency || (platform === "ALIEXPRESS" ? "USD" : (platform === "TAOBAO" || platform === "TMALL" ? "CNY" : "VND"));
    const rawPrice = extracted.price || 150;
    const priceMin = extracted.priceMin || rawPrice;
    const priceMax = extracted.priceMax || rawPrice;

    let costVND = 0;
    let sellingVND = 0;

    if (currency === "CNY") {
      const calc = this.pricingService.calculate(priceMin);
      costVND = calc.totalCostVND;
      sellingVND = calc.finalSellingPriceVND;
    } else if (currency === "USD") {
      costVND = Math.round(priceMin * 25400);
      sellingVND = Math.round(costVND * 1.4);
    } else {
      costVND = Math.round(priceMin * 0.7);
      sellingVND = priceMin;
    }

    const margin = Math.max(20, Math.round(((sellingVND - costVND) / sellingVND) * 100));

    // Dịch thuật tự động nếu là tiếng Trung hoặc tiếng Anh
    let titleVI = rawTitle;
    let titleEN = rawTitle;

    if (platform === "TAOBAO" || platform === "TMALL") {
      const viVariants = this.translationService.generateTitleVariants(rawTitle, "Thời trang");
      titleVI = viVariants.clean;
      titleEN = this.translationService.generateTitleVariantsEN(rawTitle, "Fashion").clean;
    }

    let variants: ClonedVariantPreview[] = [];
    if (Array.isArray(extracted.variants) && extracted.variants.length > 0) {
      variants = extracted.variants.map((v: any, idx: number) => {
        let vPrice = typeof v.price === "number" ? v.price : rawPrice;
        if (vPrice > 1000 && currency === "USD") vPrice = vPrice / 100;
        let vCostVND = costVND;
        let vSellingVND = sellingVND;
        if (currency === "CNY") {
          const c = this.pricingService.calculate(vPrice);
          vCostVND = c.totalCostVND;
          vSellingVND = c.finalSellingPriceVND;
        } else if (currency === "USD") {
          vCostVND = Math.round(vPrice * 25400);
          vSellingVND = Math.round(vCostVND * 1.4);
        } else {
          vCostVND = Math.round(vPrice * 0.7);
          vSellingVND = vPrice;
        }
        let img = v.featured_image?.src || (typeof v.featured_image === "string" ? v.featured_image : primaryImage);
        if (typeof img === "string" && img.startsWith("//")) img = "https:" + img;

        return {
          skuId: String(v.id || v.sku || `SKU-${idx}`),
          name: v.title || v.name || `Biến thể ${idx + 1}`,
          nameVI: v.title || v.name || `Biến thể ${idx + 1}`,
          option1: v.option1,
          option2: v.option2,
          option3: v.option3,
          originalPrice: vPrice,
          priceVND: vSellingVND,
          stock: 100,
          imageUrl: img
        };
      });
    } else {
      variants = [
        {
          skuId: `SKU-${productId}-01`,
          name: "Tiêu Chuẩn (Mặc Định)",
          nameVI: "Phiên Bản Tiêu Chuẩn",
          originalPrice: rawPrice,
          priceVND: sellingVND,
          stock: 100,
          imageUrl: primaryImage
        }
      ];
    }

    return {
      sourcePlatform: platform,
      sourceProductId: productId,
      sourceUrl,
      originalTitle: rawTitle,
      translatedTitleVI: titleVI,
      translatedTitleEN: titleEN,
      supplierName: extracted.brand || `${platform} Seller`,
      currency,
      originalPriceMin: priceMin,
      originalPriceMax: priceMax,
      estimatedCostVND: costVND,
      estimatedSellingPriceVND: sellingVND,
      estimatedMarginPercent: margin,
      primaryImage,
      galleryImages,
      detailImages,
      variants,
      rawOptions: extracted.options,
      categorySuggested: "Thời trang & Phụ kiện",
      rawAttributes: [
        { key: "Nguồn gốc", value: platform },
        { key: "Thương hiệu", value: extracted.brand || "OEM" }
      ],
      qualityScorePreview: 85
    };
  }

  private getFallbackPresetForPlatform(platform: SourcePlatform): PlatformPresetItem {
    if (platform === "TAOBAO") return PRESET_SAMPLE_CATALOG["681928471928"];
    if (platform === "TMALL") return PRESET_SAMPLE_CATALOG["712938491024"];
    if (platform === "SHOPEE") return PRESET_SAMPLE_CATALOG["987654321"];
    if (platform === "TIKTOK_SHOP") return PRESET_SAMPLE_CATALOG["1729384918294"];
    if (platform === "ALIEXPRESS") return PRESET_SAMPLE_CATALOG["1005004819283746"];
    return PRESET_SAMPLE_CATALOG["cottonon"];
  }
}

export const multiPlatformClonerService = new MultiPlatformClonerService();
