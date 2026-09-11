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
    const productId = extractProductIdFromUrl(url, platform);
    if (!productId) throw new Error("EXTRACTION_FAILED: không xác định được ID sản phẩm từ URL");

    // A. Tiêu đề (Title)
    const title = this.extractTitle(platform);
    if (!title || title.length < 3) throw new Error("EXTRACTION_FAILED: không tìm thấy tiêu đề sản phẩm");

    // B. Hình ảnh (Images)
    const images = this.extractImages(platform);
    if (!images.length) throw new Error("EXTRACTION_FAILED: không tìm thấy ảnh sản phẩm");

    // C. Giá & Tiền tệ
    const { minPriceCNY, maxPriceCNY, originalCurrency, originalMin, originalMax } = this.extractPriceInfo(platform);
    if (originalMin <= 0 || minPriceCNY <= 0) throw new Error("EXTRACTION_FAILED: không tìm thấy giá nguồn xác thực");

    // D. Video (nếu có)
    const videoUrl = this.extractVideo();

    // E. Ảnh mô tả chi tiết (Detail description images)
    const descriptionImages = this.extractDescriptionImages(platform);

    // F. Thông tin Shop / Nhà cung cấp
    const shop = this.extractShop(platform, productId);

    // G. Thuộc tính kỹ thuật
    const attributes = this.extractAttributes(platform);

    // H. Biến thể SKU
    const { skuProps, skuMap } = this.extractVariants(platform, productId, minPriceCNY, originalCurrency);

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
      descriptionImages,
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
    return docTitle.split(/[-|_|–]/)[0].trim();
  }

  private static extractImages(platform: SourcePlatform): string[] {
    const images: string[] = [];
    const JUNK_IMG_REGEX = /(?:icon|logo|badge|banner|trust|payment|flag|avatar|review|rating|star|arrow|svg|rec_|recommend|related|cart|checkout|halloween_badge|search-|img-menu|default-img|footer|header|menu|\/assets\/)/i;

    const addImg = (src: string | null | undefined) => {
      if (!src) return;
      let clean = src.trim();
      if (clean.startsWith("//")) clean = "https:" + clean;
      if ((clean.startsWith("http://") || clean.startsWith("https://")) && !JUNK_IMG_REGEX.test(clean)) {
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
      // Shopify & Custom Commerce (chỉ chọn ảnh bên trong gallery sản phẩm chính)
      ".product__media img",
      ".product-single__photo img",
      ".product-single__media img",
      ".product__modal-opener img",
      ".product-gallery img",
      ".pdp-image-gallery img",
      "[data-media-id] img",
      // Shopee
      ".product-briefing img",
      "._2J7wog img",
      "._10K-jF img",
      // Taobao & Tmall
      "#J_UlThumb img",
      ".PicGallery--thumbnails--1M-6x19 img",
      ".tb-thumb img",
      // TikTok Shop
      ".product-gallery img",
      // AliExpress
      ".images--wrap--wFkP-6p img",
      ".image-viewer img",
      ".gallery-wrap img",
      // Generic product images
      ".gallery img",
      ".product-images img"
    ];

    for (const sel of gallerySelectors) {
      const els = document.querySelectorAll(sel);
      els.forEach(el => {
        // Bỏ qua nếu ảnh nằm trong vùng gợi ý, thanh toán, menu, footer
        if (el.closest?.(".recommendations, .related-products, .product-recommendations, footer, header, nav, .cart, .announcement-bar")) return;
        const img = el as HTMLImageElement;
        const src = img.getAttribute("data-src") || img.getAttribute("zoom-src") || img.src;
        addImg(src);
      });
      if (images.length >= 8) break;
    }

    // 4. Nếu vẫn chưa có ảnh, quét các img có kích thước lớn (> 220px) ngoài header/footer/recommendation
    if (images.length === 0) {
      document.querySelectorAll("main img, #content img, .main-content img").forEach(img => {
        const el = img as HTMLImageElement;
        if (el.closest?.(".recommendations, .related-products, .product-recommendations, footer, header, nav, .cart, .announcement-bar")) return;
        if (el.naturalWidth > 220 || el.width > 220) {
          addImg(el.src);
        }
      });
    }

    return images.slice(0, 10);
  }

  private static extractDescriptionImages(platform: SourcePlatform): string[] {
    const descImages: string[] = [];
    const JUNK_IMG_REGEX = /(?:icon|logo|badge|banner|trust|payment|flag|avatar|review|rating|star|arrow|svg|rec_|recommend|related|cart|checkout|halloween_badge|search-|img-menu|default-img|footer|header|menu|\/assets\/)/i;

    const addDescImg = (src: string | null | undefined) => {
      if (!src) return;
      let clean = src.trim();
      if (clean.startsWith("//")) clean = "https:" + clean;
      if ((clean.startsWith("http://") || clean.startsWith("https://")) && !JUNK_IMG_REGEX.test(clean)) {
        clean = clean.replace(/_\d+x\d+.*$/, "").replace(/\.32x32\..*$/, ".800x800.");
        if (!descImages.includes(clean)) {
          descImages.push(clean);
        }
      }
    };

    const descSelectors = [
      ".product__description img",
      ".product-single__description img",
      "[data-product-description] img",
      ".product-description img",
      ".rte img",
      "#description img",
      ".description img",
      "#product-description img",
      ".product-detail-tab img",
      "#desc-lazyload-container img",
      ".content-detail img",
      "[class*='detail-desc'] img",
      "[class*='desc-item'] img",
      "[data-e2e='product-description'] img",
      ".woocommerce-product-details__short-description img",
      "#tab-description img"
    ];

    document.querySelectorAll(descSelectors.join(", ")).forEach(img => {
      const el = img as HTMLImageElement;
      addDescImg(el.getAttribute("data-src") || el.getAttribute("data-lazyload-src") || el.getAttribute("data-original") || el.src);
    });

    return descImages.slice(0, 15);
  }

  private static extractPriceInfo(platform: SourcePlatform): {
    minPriceCNY: number;
    maxPriceCNY: number;
    originalCurrency: "CNY" | "VND" | "USD";
    originalMin: number;
    originalMax: number;
  } {
    let originalCurrency: "CNY" | "VND" | "USD" = "USD";
    let foundPrices: number[] = [];

    // 1. Kiểm tra trực tiếp thẻ meta OpenGraph price & currency (Chuẩn quốc tế trên Shopify như Macorner, WooCommerce...)
    const metaPrice = document.querySelector('meta[property="og:price:amount"], meta[property="product:price:amount"]')?.getAttribute("content");
    const metaCurr = document.querySelector('meta[property="og:price:currency"], meta[property="product:price:currency"]')?.getAttribute("content");
    if (metaCurr) {
      const c = metaCurr.toUpperCase().trim();
      if (c === "USD" || c === "VND" || c === "CNY") {
        originalCurrency = c;
      }
    }
    if (metaPrice) {
      const p = parseFloat(metaPrice.replace(/[^0-9.]/g, ""));
      if (!isNaN(p) && p > 0) {
        foundPrices.push(p);
      }
    }

    // Nhận diện tiền tệ theo platform nếu chưa có
    if (foundPrices.length === 0) {
      if (platform === "SHOPEE") {
        originalCurrency = "VND";
      } else if (platform === "ALIEXPRESS" || platform === "GENERIC_WEB") {
        originalCurrency = "USD";
      } else if (platform === "TAOBAO" || platform === "TMALL" || platform === "1688") {
        originalCurrency = "CNY";
      }
    }

    // Quét giá từ các selector
    const priceSelectors = [
      // Shopify / Macorner
      ".price-item--regular",
      ".price-item--sale",
      ".product__price",
      "[data-product-price]",
      ".price--on-sale",
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
    let originalMin = foundPrices.length > 0 ? Math.min(...foundPrices) : 0;
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
    // 1. Thử lấy từ OpenGraph site_name (ví dụ: Macorner)
    const ogSite = document.querySelector('meta[property="og:site_name"]')?.getAttribute("content");
    if (ogSite && ogSite.trim().length > 1) {
      return {
        shopId: `shop_${productId}`,
        shopName: ogSite.trim(),
        shopUrl: window.location.origin
      };
    }

    let shopName = window.location.hostname;
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
      shopUrl: window.location.origin
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

  private static extractVariants(
    platform: SourcePlatform,
    productId: string,
    basePriceCNY: number,
    currency: "USD" | "VND" | "CNY" = "USD"
  ): {
    skuProps: Raw1688SkuProp[];
    skuMap: Record<string, Raw1688SkuItem>;
  } {
    const toCny = (p: number) => {
      if (typeof p !== "number" || isNaN(p)) return basePriceCNY;
      return currency === "VND"
        ? Math.round((p / 3800) * 10) / 10
        : currency === "USD"
        ? Math.round(p * 7.2 * 10) / 10
        : p;
    };

    // 1. Thử quét variants từ thẻ script application/json (Shopify Dawn / 2.0 / WooCommerce)
    let parsedVariants: any[] = [];
    try {
      const jsonScripts = document.querySelectorAll('script[type="application/json"]');
      for (const s of jsonScripts) {
        try {
          const parsed = JSON.parse(s.textContent || "");
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && (parsed[0].title || parsed[0].price !== undefined)) {
            parsedVariants = parsed;
            break;
          }
        } catch {}
      }
    } catch {}

    // 2. Thử quét từ thẻ select[name="id"] của Shopify form
    if (parsedVariants.length === 0) {
      try {
        const select = document.querySelector('select[name="id"]');
        if (select) {
          const options = select.querySelectorAll("option");
          if (options.length > 1) {
            parsedVariants = Array.from(options).map((opt, idx) => {
              const text = opt.textContent?.trim() || "";
              const val = opt.value || `v_${idx}`;
              const parts = text.split(" - ");
              const title = parts[0]?.trim() || text;
              const priceMatch = text.match(/\$\s*([0-9.,]+)/);
              const price = priceMatch ? parseFloat(priceMatch[1].replace(",", "")) : basePriceCNY;
              const optParts = title.split("/").map(s => s.trim());

              return {
                id: val,
                title,
                option1: optParts[0] || title,
                option2: optParts[1] || null,
                price
              };
            });
          }
        }
      } catch {}
    }

    if (parsedVariants.length > 0) {
      const opt1Vals = [...new Set(parsedVariants.map(v => v.option1).filter(Boolean))] as string[];
      const opt2Vals = [...new Set(parsedVariants.map(v => v.option2).filter(Boolean))] as string[];

      let skuProps: Raw1688SkuProp[] = [];
      const skuMap: Record<string, Raw1688SkuItem> = {};

      if (opt1Vals.length > 0 && opt2Vals.length > 0) {
        skuProps = [
          {
            propId: "prop_1",
            propNameCN: "Kích thước",
            values: opt1Vals.map((val, idx) => ({ valueId: `v1_${idx}`, valueCN: val }))
          },
          {
            propId: "prop_2",
            propNameCN: "Quy cách",
            values: opt2Vals.map((val, idx) => ({ valueId: `v2_${idx}`, valueCN: val }))
          }
        ];

        parsedVariants.forEach((v: any) => {
          let vPrice = typeof v.price === "number" ? v.price : basePriceCNY;
          if (vPrice >= 100 && currency === "USD") vPrice = Math.round((vPrice / 100) * 100) / 100;
          const vPriceCNY = toCny(vPrice);
          let img = v.featured_image?.src || (typeof v.featured_image === "string" ? v.featured_image : undefined);
          if (img && img.startsWith("//")) img = "https:" + img;

          const skuItem: Raw1688SkuItem = {
            skuId: String(v.id),
            attributes: {
              "Kích thước": v.option1 || "",
              "Quy cách": v.option2 || ""
            },
            priceCNY: vPriceCNY > 0 ? vPriceCNY : basePriceCNY,
            stock: Number.isFinite(v.inventory_quantity) ? Math.max(0, Math.trunc(v.inventory_quantity)) : 0,
            imageUrl: img
          };

          skuMap[String(v.id)] = skuItem;
          if (v.option1 && v.option2) {
            skuMap[`${v.option1}&${v.option2}`] = skuItem;
            skuMap[`${v.option1}>${v.option2}`] = skuItem;
            skuMap[`${v.option1};${v.option2}`] = skuItem;
            skuMap[`${v.option1} ${v.option2}`] = skuItem;
            skuMap[`${v.option1}_${v.option2}`] = skuItem;
            skuMap[`${v.option1} / ${v.option2}`] = skuItem;
          }
          if (v.title) skuMap[v.title] = skuItem;
        });

        return { skuProps, skuMap };
      } else {
        skuProps = [
          {
            propId: "prop_variants",
            propNameCN: "Phân loại",
            values: parsedVariants.map((v: any) => ({
              valueId: String(v.id),
              valueCN: v.title || v.name || "Phân loại",
              imageUrl: v.featured_image?.src
            }))
          }
        ];

        parsedVariants.forEach((v: any) => {
          let vPrice = typeof v.price === "number" ? v.price : basePriceCNY;
          if (vPrice >= 100 && currency === "USD") vPrice = Math.round((vPrice / 100) * 100) / 100;
          const vPriceCNY = toCny(vPrice);
          let img = v.featured_image?.src || (typeof v.featured_image === "string" ? v.featured_image : undefined);
          if (img && img.startsWith("//")) img = "https:" + img;

          const skuItem: Raw1688SkuItem = {
            skuId: String(v.id),
            attributes: { "Phân loại": v.title || v.name || "Phân loại" },
            priceCNY: vPriceCNY > 0 ? vPriceCNY : basePriceCNY,
            stock: Number.isFinite(v.inventory_quantity) ? Math.max(0, Math.trunc(v.inventory_quantity)) : 0,
            imageUrl: img
          };

          skuMap[String(v.id)] = skuItem;
          if (v.title) skuMap[v.title] = skuItem;
        });

        return { skuProps, skuMap };
      }
    }

    // Fallback: 1 phân loại tiêu chuẩn mặc định
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
        skuId: `sku_${productId}_default`,
        attributes: { "Phân loại": "Tiêu chuẩn (Default)" },
        priceCNY: basePriceCNY,
        stock: 0
      }
    };

    return { skuProps, skuMap };
  }
}
