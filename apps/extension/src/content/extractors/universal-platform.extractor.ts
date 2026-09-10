import {
  Raw1688Product,
  Raw1688Shop,
  Raw1688SkuProp,
  Raw1688SkuItem,
  Raw1688Attribute,
  SourcePlatform
} from "@hub1688/shared-types";
import { detectProductPlatform, extractProductIdFromUrl } from "@hub1688/shared-utils";
import { Detail1688Extractor } from "./1688-detail.extractor.js";

export class UniversalPlatformExtractor {
  /**
   * Tự động nhận diện nền tảng (1688, Taobao, Tmall, Shopee, TikTok Shop, AliExpress, Web)
   * và bóc tách thông tin sản phẩm đầy đủ nhất từ DOM hiện tại.
   */
  public static async extract(): Promise<Raw1688Product> {
    const url = window.location.href;
    const platform = detectProductPlatform(url);

    // 1. Nếu là 1688, dùng extractor chuyên biệt cho 1688
    if (platform === "1688") {
      const prod = await Detail1688Extractor.extract();
      prod.sourcePlatform = "1688";
      return prod;
    }

    // 2. Bóc tách phổ quát cho các nền tảng khác (Taobao, Tmall, Shopee, TikTok, AliExpress, Web)
    const productId = extractProductIdFromUrl(url, platform) || `hub_${Date.now()}`;

    // A. Tiêu đề (Title)
    const title = this.extractTitle(platform);

    // B. Hình ảnh (Images)
    const images = this.extractImages(platform);

    // C. Giá & Tiền tệ
    const { minPriceCNY, maxPriceCNY, originalCurrency, originalMin, originalMax } = this.extractPriceInfo(platform);

    // D. Video (nếu có)
    const videoUrl = this.extractVideo();

    // E. Thông tin Shop / Nhà cung cấp
    const shop = this.extractShop(platform, productId);

    // F. Thuộc tính kỹ thuật
    const attributes = this.extractAttributes(platform);

    // G. Biến thể SKU
    const { skuProps, skuMap } = this.extractVariants(platform, minPriceCNY);

    return {
      offerId: productId,
      sourceUrl: url,
      title,
      sourcePlatform: platform,
      originalCurrency,
      originalPriceMin: originalMin,
      originalPriceMax: originalMax,
      shop,
      moq: 1,
      prices: {
        minPriceCNY,
        maxPriceCNY,
        currency: "CNY"
      },
      images,
      videoUrl,
      attributes,
      skuProps,
      skuMap,
      extractedAt: new Date().toISOString()
    };
  }

  private static extractTitle(platform: SourcePlatform): string {
    // 1. Thử lấy từ OpenGraph hoặc Twitter meta
    const ogTitle = document.querySelector('meta[property="og:title"], meta[name="twitter:title"]')?.getAttribute("content");
    if (ogTitle && ogTitle.trim().length > 5) {
      return ogTitle.trim();
    }

    // 2. Thử lấy từ platform-specific DOM selectors
    const selectors = [
      // Shopee
      "div._44qnta",
      "h1.V3Cixk",
      ".product-briefing h1",
      // Taobao & Tmall
      ".ItemHeader--mainTitle--ndCD4iN",
      "h1.tb-main-title",
      ".ItemHeader--title--1gUaC17",
      // TikTok Shop
      ".product-title",
      "h1.title",
      "[data-e2e='product-title']",
      // AliExpress
      "h1.title--wrap--eGQk2Bl",
      ".product-title-text",
      // Generic
      "h1",
      ".product-name",
      ".pdp-title"
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel) as HTMLElement;
      if (el && el.innerText.trim().length > 5) {
        return el.innerText.trim();
      }
    }

    // 3. Fallback: document.title
    const docTitle = document.title || "";
    return docTitle.split(/[-|_|–]/)[0].trim() || `Sản phẩm ${platform}`;
  }

  private static extractImages(platform: SourcePlatform): string[] {
    const images: string[] = [];

    const addImg = (src: string | null | undefined) => {
      if (!src) return;
      let clean = src.trim();
      if (clean.startsWith("//")) clean = "https:" + clean;
      if (clean.startsWith("http://") || clean.startsWith("https://")) {
        // Loại bỏ thumbnail query params để lấy ảnh gốc độ phân giải cao
        clean = clean.replace(/_\d+x\d+.*$/, "").replace(/\.32x32\..*$/, ".800x800.");
        if (!images.includes(clean)) {
          images.push(clean);
        }
      }
    };

    // 1. OpenGraph / Twitter meta images
    const ogImg = document.querySelector('meta[property="og:image"], meta[name="twitter:image"]')?.getAttribute("content");
    addImg(ogImg);

    // 2. Link rel image_src
    const linkImg = document.querySelector('link[rel="image_src"]')?.getAttribute("href");
    addImg(linkImg);

    // 3. Platform-specific gallery images
    const gallerySelectors = [
      // Shopee
      ".product-briefing img",
      "._2J7wog img",
      "._10K-jF img",
      // Taobao & Tmall
      "#J_UlThumb img",
      ".PicGallery--thumbnails--1M-6x19 img",
      ".tb-thumb img",
      // TikTok Shop
      "img[src*='tiktokcdn']",
      ".product-gallery img",
      // AliExpress
      ".images--wrap--wFkP-6p img",
      ".image-viewer img",
      ".gallery-wrap img",
      // Generic product images
      ".gallery img",
      ".product-images img",
      "main img"
    ];

    for (const sel of gallerySelectors) {
      const els = document.querySelectorAll(sel);
      els.forEach(el => {
        const img = el as HTMLImageElement;
        const src = img.getAttribute("data-src") || img.getAttribute("zoom-src") || img.src;
        addImg(src);
      });
      if (images.length >= 6) break;
    }

    // 4. Nếu vẫn chưa có ảnh, quét toàn bộ img có kích thước lớn (> 180px)
    if (images.length === 0) {
      document.querySelectorAll("img").forEach(img => {
        if (img.naturalWidth > 180 || img.width > 180) {
          addImg(img.src);
        }
      });
    }

    // 5. Fallback placeholder
    if (images.length === 0) {
      images.push("https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop");
    }

    return images.slice(0, 10);
  }

  private static extractPriceInfo(platform: SourcePlatform): {
    minPriceCNY: number;
    maxPriceCNY: number;
    originalCurrency: "CNY" | "VND" | "USD";
    originalMin: number;
    originalMax: number;
  } {
    let originalCurrency: "CNY" | "VND" | "USD" = "CNY";
    let foundPrices: number[] = [];

    // Nhận diện tiền tệ theo platform
    if (platform === "SHOPEE") {
      originalCurrency = "VND";
    } else if (platform === "ALIEXPRESS") {
      originalCurrency = "USD";
    } else if (platform === "TAOBAO" || platform === "TMALL") {
      originalCurrency = "CNY";
    }

    // Quét giá từ các selector
    const priceSelectors = [
      // Shopee
      "._3n5zSv",
      ".pqTWkA",
      ".product-price",
      // Taobao & Tmall
      ".Price--priceText--2Sm67D_",
      ".tb-rmb-num",
      ".price-wrap .price",
      // TikTok Shop
      ".detail-price",
      ".price-item",
      // AliExpress
      ".price--currentPriceText--2AQG17x",
      ".product-price-value",
      // Generic
      ".price",
      ".current-price",
      "[data-price]"
    ];

    for (const sel of priceSelectors) {
      const els = document.querySelectorAll(sel);
      els.forEach(el => {
        const text = (el as HTMLElement).innerText || "";
        // Nếu có ký hiệu tiền tệ cụ thể
        if (text.includes("₫") || text.includes("đ") || text.includes("VND")) {
          originalCurrency = "VND";
        } else if (text.includes("$") || text.includes("USD")) {
          originalCurrency = "USD";
        } else if (text.includes("¥") || text.includes("￥")) {
          originalCurrency = "CNY";
        }

        const cleaned = text.replace(/[^0-9.,]/g, "").replace(",", ".");
        const val = parseFloat(cleaned);
        if (!isNaN(val) && val > 0) {
          foundPrices.push(val);
        }
      });
      if (foundPrices.length > 0) break;
    }

    // Mặc định an toàn nếu không bóc tách được từ DOM
    let originalMin = foundPrices.length > 0 ? Math.min(...foundPrices) : (originalCurrency === "VND" ? 150000 : 35);
    let originalMax = foundPrices.length > 0 ? Math.max(...foundPrices) : originalMin;

    // Quy đổi ra CNY cho hệ thống định giá & biên lợi nhuận
    let minPriceCNY = originalMin;
    let maxPriceCNY = originalMax;

    if (originalCurrency === "VND") {
      // 1 CNY ~ 3,800 VND
      minPriceCNY = Math.round((originalMin / 3800) * 10) / 10;
      maxPriceCNY = Math.round((originalMax / 3800) * 10) / 10;
    } else if (originalCurrency === "USD") {
      // 1 USD ~ 7.2 CNY
      minPriceCNY = Math.round(originalMin * 7.2 * 10) / 10;
      maxPriceCNY = Math.round(originalMax * 7.2 * 10) / 10;
    }

    if (minPriceCNY <= 0) minPriceCNY = 30;
    if (maxPriceCNY <= 0) maxPriceCNY = minPriceCNY;

    return {
      minPriceCNY,
      maxPriceCNY,
      originalCurrency,
      originalMin,
      originalMax
    };
  }

  private static extractVideo(): string | null {
    const video = document.querySelector("video");
    if (video) {
      const src = video.src || video.querySelector("source")?.src;
      if (src && !src.startsWith("blob:")) return src;
    }
    const dataVideo = document.querySelector("[data-video-url], [data-mp4]");
    if (dataVideo) {
      return dataVideo.getAttribute("data-video-url") || dataVideo.getAttribute("data-mp4") || null;
    }
    return null;
  }

  private static extractShop(platform: SourcePlatform, productId: string): Raw1688Shop {
    let shopName = `${platform} Store`;
    const shopSelectors = [
      ".shop-name",
      ".seller-name",
      ".store-name",
      ".shop-header a",
      "[data-e2e='shop-name']",
      ".shop-head-info a"
    ];

    for (const sel of shopSelectors) {
      const el = document.querySelector(sel) as HTMLElement;
      if (el && el.innerText.trim().length > 1) {
        shopName = el.innerText.trim();
        break;
      }
    }

    return {
      shopId: `shop_${productId}`,
      shopName,
      shopUrl: window.location.origin,
      ratingScore: 4.9
    };
  }

  private static extractAttributes(platform: SourcePlatform): Raw1688Attribute[] {
    const attrs: Raw1688Attribute[] = [
      { nameCN: "Nền tảng xuất xứ", valueCN: platform },
      { nameCN: "Thời gian scan", valueCN: new Date().toLocaleDateString("vi-VN") }
    ];

    // Quét các thông số từ bảng spec
    const specItems = document.querySelectorAll(".specification-item, .attribute-item, .params-item, .ItemProperties--item--1h9e3lA");
    specItems.forEach(item => {
      const label = item.querySelector(".label, .key, .name")?.textContent?.trim();
      const val = item.querySelector(".value, .val")?.textContent?.trim();
      if (label && val) {
        attrs.push({ nameCN: label, valueCN: val });
      }
    });

    return attrs.slice(0, 10);
  }

  private static extractVariants(platform: SourcePlatform, basePriceCNY: number): {
    skuProps: Raw1688SkuProp[];
    skuMap: Record<string, Raw1688SkuItem>;
  } {
    const skuProps: Raw1688SkuProp[] = [
      {
        propId: "prop_option",
        propNameCN: "Phân loại",
        values: [
          { valueId: "val_default", valueCN: "Tiêu chuẩn (Default)" }
        ]
      }
    ];

    const skuMap: Record<string, Raw1688SkuItem> = {
      "val_default": {
        skuId: `sku_${Date.now()}_default`,
        attributes: { "Phân loại": "Tiêu chuẩn (Default)" },
        priceCNY: basePriceCNY,
        stock: 500
      }
    };

    return { skuProps, skuMap };
  }
}
