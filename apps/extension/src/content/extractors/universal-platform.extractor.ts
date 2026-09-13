import {
  Raw1688Product,
  Raw1688Shop,
  Raw1688SkuProp,
  Raw1688SkuItem,
  Raw1688Attribute,
  SourcePlatform,
  SourceOptionGroup,
  SourceCurrency,
  CustomizationEvidence
} from "@hub1688/shared-types";
import { detectProductPlatform, extractProductIdFromUrl } from "@hub1688/shared-utils";
import { Detail1688Extractor } from "./1688-detail.extractor.js";

const normalizePublicImageUrl = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined;
  let image = value.trim();
  if (!image || image.startsWith("data:") || image.startsWith("blob:")) return undefined;
  if (image.startsWith("//")) image = `https:${image}`;
  try { return new URL(image, window.location.href).href; } catch { return undefined; }
};

const parsePriceText = (value: unknown): number => {
  const text = String(value ?? "").replace(/\u00a0/g, " ").trim();
  if (!text) return 0;
  const match = text.match(/(?:\d[\d\s.,]*\d|\d+(?:[.,]\d+)?)/);
  if (!match) return 0;
  let numeric = match[0].replace(/\s/g, "");
  const comma = numeric.lastIndexOf(",");
  const dot = numeric.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    // Last separator is decimal only when it has one or two trailing digits.
    const decimalIndex = Math.max(comma, dot);
    const decimals = numeric.length - decimalIndex - 1;
    numeric = decimals <= 2
      ? `${numeric.slice(0, decimalIndex).replace(/[.,]/g, "")}.${numeric.slice(decimalIndex + 1)}`
      : numeric.replace(/[.,]/g, "");
  } else if (comma >= 0) {
    const decimals = numeric.length - comma - 1;
    numeric = decimals <= 2 ? numeric.replace(",", ".") : numeric.replace(/,/g, "");
  } else if (dot >= 0) {
    const decimals = numeric.length - dot - 1;
    numeric = decimals <= 2 ? numeric : numeric.replace(/\./g, "");
  }
  const parsed = Number.parseFloat(numeric);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const findJsonLdProduct = (value: any, seen = new Set<any>()): any | null => {
  if (!value || typeof value !== "object" || seen.has(value)) return null;
  seen.add(value);
  const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
  if (types.some((type: unknown) => String(type || "").toLowerCase() === "product")) return value;
  if (Array.isArray(value)) {
    for (const item of value) { const product = findJsonLdProduct(item, seen); if (product) return product; }
  } else {
    for (const nested of [value["@graph"], value.mainEntity, value.itemListElement]) {
      const product = findJsonLdProduct(nested, seen);
      if (product) return product;
    }
  }
  return null;
};

const readSchemaProduct = (): any | null => {
  for (const script of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      const parsed = JSON.parse(script.textContent || "{}");
      const product = findJsonLdProduct(parsed);
      if (product) return product;
    } catch {
      // Ignore malformed or bot-injected JSON-LD blocks.
    }
  }
  return null;
};

const getSourceInventoryState = (variant: any): { stock: number; available: boolean; inventoryTracked: boolean } => {
  const inventoryTracked = Number.isFinite(variant?.inventory_quantity);
  const stock = inventoryTracked ? Math.max(0, Math.trunc(Number(variant.inventory_quantity))) : 0;
  const available = typeof variant?.available === "boolean"
    ? variant.available
    : inventoryTracked && stock > 0;
  return { stock, available, inventoryTracked };
};

export class UniversalPlatformExtractor {
  /**
   * Tự động nhận diện nền tảng (1688, Taobao, Tmall, Shopee, TikTok Shop,
   * AliExpress, Etsy, Amazon và Web)
   * và bóc tách thông tin sản phẩm đầy đủ nhất từ DOM hiện tại.
   */
  public static async extract(): Promise<Raw1688Product> {
    const url = window.location.href;
    const platform = detectProductPlatform(url);

    const customizerReadySelector = "#custom-options .ant-form-item, #custom-options input, #custom-options textarea, .personalized-form .ant-form-item, .personalized-form input, .personalized-form textarea, #customily-options .customily_option, .customily-main-app .customily_option";
    if (/macorner\.co$/i.test(window.location.hostname) && window.location.pathname.includes("/products/") && !document.querySelector(customizerReadySelector)) {
      await new Promise<void>(resolve => {
        const observer = new MutationObserver(() => {
          if (document.querySelector(customizerReadySelector)) {
            observer.disconnect();
            resolve();
          }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        window.setTimeout(() => { observer.disconnect(); resolve(); }, 8000);
      });
    }

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

    // H. Customizer metadata is intentionally kept separate from the
    // commercial SKU matrix. A customizer can expose text, uploads, or
    // design assets without creating a new sellable variant.
    const personalization = this.extractPersonalizationMetadata();
    personalization.customOptionGroups
      .flatMap(group => group.values.map(value => value.imageUrl).filter(Boolean) as string[])
      .forEach(image => {
        if (!images.includes(image)) images.push(image);
      });

    // I. Biến thể SKU
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
      optionGroups: this.extractNativeOptionGroups(platform),
      customOptionGroups: personalization.customOptionGroups,
      customizationEvidence: personalization.customizationEvidence,
      extractedAt: new Date().toISOString()
    };
  }

  private static extractTitle(platform: SourcePlatform): string {
    const schemaProduct = readSchemaProduct();
    if (schemaProduct?.name && String(schemaProduct.name).trim().length > 5) {
      return String(schemaProduct.name).trim();
    }
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
      // Etsy
      "h1[data-buy-box-listing-title]",
      "h1[data-selector='listing-page-title']",
      ".wt-text-body-03.wt-break-word",
      // Amazon
      "#productTitle",
      "#title",
      "h1.product-title-word-break",
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
    const JUNK_IMG_REGEX = /(?:icon|logo|badge|banner|trust|payment|flag|avatar|review|rating|star|arrow|svg|rec_|recommend|related|cart|checkout|halloween_badge|search-|img-menu|default-img|footer|header|menu|grey-pixel|pixel\.gif|play-icon|\/assets\/|_AC_(?:SR|SS|SX)\d*)/i;

    const addImg = (src: string | null | undefined) => {
      if (!src) return;
      let clean = src.trim();
      if (clean.startsWith("//")) clean = "https:" + clean;
      if ((clean.startsWith("http://") || clean.startsWith("https://")) && !JUNK_IMG_REGEX.test(clean)) {
        // Loại bỏ thumbnail query params để lấy ảnh gốc độ phân giải cao
        clean = clean.replace(/_\d+x\d+.*$/, "").replace(/\.32x32\..*$/, ".800x800.");
        if (/m\.media-amazon\.|images-na\.ssl-images-amazon\./i.test(clean)) {
          clean = clean.replace(/(?:\._|_)[A-Z]{2,}(?:_[A-Z0-9,]+)*_\.(\w+)$/i, ".$1");
        }
        if (!images.includes(clean)) {
          images.push(clean);
        }
      }
    };

    const schemaProduct = readSchemaProduct();
    const schemaImages = Array.isArray(schemaProduct?.image) ? schemaProduct.image : [schemaProduct?.image];
    schemaImages.forEach((image: any) => addImg(typeof image === "string" ? image : image?.url || image?.contentUrl || image?.contentURL));

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
      // Etsy
      "[data-listing-id] img",
      "[data-carousel] img",
      "[data-selector='listing-image'] img",
      ".listing-page-image img",
      // Amazon
      "#landingImage",
      "#imgBlkFront",
      "#altImages img",
      "#imageBlock img",
      "#main-image-container img",
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
        const src = img.getAttribute("data-old-hires") || img.getAttribute("data-zoom-image") || img.getAttribute("data-src") || img.getAttribute("zoom-src") || img.src;
        addImg(src);
        const dynamic = img.getAttribute("data-a-dynamic-image");
        if (dynamic) {
          try {
            const parsed = JSON.parse(dynamic);
            Object.keys(parsed).forEach(addImg);
          } catch { /* Amazon may encode this as invalid JSON while hydrating. */ }
        }
      });
      if (images.length >= 8) break;
    }

    // Personalized image swatches (e.g. Macorner/Customily) are part of the
    // product choices and should be available in the imported gallery too.
    document.querySelectorAll("#custom-options .swatch-container img, .personalized-form .swatch-container img, [data-personalization] img, #customily-options .customily-swatch img, .customily-main-app .customily-swatch img").forEach(img => {
      const el = img as HTMLImageElement;
      addImg(el.getAttribute("data-src") || el.getAttribute("data-original") || el.src);
    });

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
    originalCurrency: SourceCurrency;
    originalMin: number;
    originalMax: number;
  } {
    let originalCurrency: SourceCurrency = "USD";
    let foundPrices: number[] = [];

    if (platform === "AMAZON") {
      const host = window.location.hostname.toLowerCase();
      if (host.endsWith("amazon.com.br")) originalCurrency = "BRL";
      else if (host.endsWith("amazon.com.mx")) originalCurrency = "MXN";
      else if (host.endsWith("amazon.co.uk")) originalCurrency = "GBP";
      else if (/amazon\.(?:de|fr|it|es|nl)$/.test(host) || host.endsWith("amazon.com.be")) originalCurrency = "EUR";
      else if (host.endsWith("amazon.ca")) originalCurrency = "CAD";
      else if (host.endsWith("amazon.com.au")) originalCurrency = "AUD";
      else if (host.endsWith("amazon.co.jp")) originalCurrency = "JPY";
      else if (host.endsWith("amazon.in")) originalCurrency = "INR";
      else if (host.endsWith("amazon.se")) originalCurrency = "SEK";
      else if (host.endsWith("amazon.pl")) originalCurrency = "PLN";
      else if (host.endsWith("amazon.sg")) originalCurrency = "SGD";
      else if (host.endsWith("amazon.ae")) originalCurrency = "AED";
      else if (host.endsWith("amazon.sa")) originalCurrency = "SAR";
      else if (host.endsWith("amazon.com.tr")) originalCurrency = "TRY";
    }

    const addPrice = (value: unknown) => {
      const parsed = parsePriceText(value);
      if (parsed > 0 && !foundPrices.includes(parsed)) foundPrices.push(parsed);
    };

    const schemaProduct = readSchemaProduct();
    const schemaOffers = Array.isArray(schemaProduct?.offers) ? schemaProduct.offers : [schemaProduct?.offers];
    schemaOffers.forEach((offer: any) => {
      if (!offer) return;
      addPrice(offer.price);
      addPrice(offer.lowPrice);
      addPrice(offer.highPrice);
      const specifications = Array.isArray(offer.priceSpecification) ? offer.priceSpecification : [offer.priceSpecification];
      specifications.forEach((spec: any) => {
        if (!spec) return;
        addPrice(spec.price);
        addPrice(spec.minPrice);
        addPrice(spec.maxPrice);
      });
      const schemaCurrency = String(offer.priceCurrency || specifications.find((spec: any) => spec?.priceCurrency)?.priceCurrency || "").toUpperCase();
      if (["USD", "VND", "CNY", "EUR", "GBP", "CAD", "AUD", "JPY", "INR", "BRL", "MXN", "SEK", "PLN", "SGD", "AED", "SAR", "TRY"].includes(schemaCurrency)) {
        originalCurrency = schemaCurrency as SourceCurrency;
      }
    });

    // 1. Kiểm tra trực tiếp thẻ meta OpenGraph price & currency (Chuẩn quốc tế trên Shopify như Macorner, WooCommerce...)
    const metaPrice = document.querySelector('meta[property="og:price:amount"], meta[property="product:price:amount"]')?.getAttribute("content");
    const metaCurr = document.querySelector('meta[property="og:price:currency"], meta[property="product:price:currency"]')?.getAttribute("content");
    if (metaCurr) {
      const c = metaCurr.toUpperCase().trim();
      if (["USD", "VND", "CNY", "EUR", "GBP", "CAD", "AUD", "JPY", "INR", "BRL", "MXN", "SEK", "PLN", "SGD", "AED", "SAR", "TRY"].includes(c)) {
        originalCurrency = c as SourceCurrency;
      }
    }
    if (metaPrice) {
      addPrice(metaPrice);
    }

    // Nhận diện tiền tệ theo platform nếu chưa có
    if (foundPrices.length === 0) {
      if (platform === "SHOPEE") {
        originalCurrency = "VND";
      } else if (platform === "ALIEXPRESS" || platform === "ETSY" || platform === "GENERIC_WEB") {
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
      // Etsy
      "[data-selector='listing-price']",
      "[data-buy-box-region] .currency-value",
      ".wt-text-title-03",
      ".wt-text-title-01",
      // Amazon
      "#corePrice_feature_div .a-offscreen",
      "#apex_desktop .a-offscreen",
      "#priceblock_ourprice",
      "#priceblock_dealprice",
      "#price_inside_buybox",
      ".a-price .a-offscreen",
      ".priceToPay .a-offscreen",
      "#corePriceDisplay_desktop_feature_div .a-offscreen",
      ".a-color-price",
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
        } else if (/R\s*\$/i.test(text) || /\bBRL\b/i.test(text)) {
          originalCurrency = "BRL";
        } else if (/(?:MX|MEX)\s*\$/i.test(text) || /\bMXN\b/i.test(text)) {
          originalCurrency = "MXN";
        } else if (/S\s*\$/i.test(text) || /\bSGD\b/i.test(text)) {
          originalCurrency = "SGD";
        } else if (/(?:CA|CAD)\s*\$/.test(text) || /\bCAD\b/i.test(text)) {
          originalCurrency = "CAD";
        } else if (/(?:A|AU|AUD)\s*\$/.test(text) || /\bAUD\b/i.test(text)) {
          originalCurrency = "AUD";
        } else if (text.includes("€") || /\bEUR\b/i.test(text)) {
          originalCurrency = "EUR";
        } else if (text.includes("£") || /\bGBP\b/i.test(text)) {
          originalCurrency = "GBP";
        } else if (text.includes("₹") || /\bINR\b/i.test(text)) {
          originalCurrency = "INR";
        } else if (/\bAED\b/i.test(text)) {
          originalCurrency = "AED";
        } else if (/\bSAR\b/i.test(text)) {
          originalCurrency = "SAR";
        } else if (text.includes("₺") || /\bTRY\b|\bTL\b/i.test(text)) {
          originalCurrency = "TRY";
        } else if (text.includes("zł") || /\bPLN\b/i.test(text)) {
          originalCurrency = "PLN";
        } else if (/\bSEK\b/i.test(text) || (platform === "AMAZON" && window.location.hostname.endsWith("amazon.se") && /\bkr\b/i.test(text))) {
          originalCurrency = "SEK";
        } else if (text.includes("¥") || text.includes("￥")) {
          originalCurrency = platform === "AMAZON" && window.location.hostname.endsWith("amazon.co.jp") ? "JPY" : "CNY";
        } else if (text.includes("$") || text.includes("USD")) {
          if (!["CAD", "AUD", "SGD", "MXN"].includes(originalCurrency)) originalCurrency = "USD";
        }

        addPrice(text);
      });
      if (foundPrices.length > 0) break;
    }

    // Mặc định an toàn nếu không bóc tách được từ DOM
    let originalMin = foundPrices.length > 0 ? Math.min(...foundPrices) : 0;
    let originalMax = foundPrices.length > 0 ? Math.max(...foundPrices) : originalMin;

    // Quy đổi ra CNY cho hệ thống định giá & biên lợi nhuận
    let minPriceCNY = originalMin;
    let maxPriceCNY = originalMax;

    const sourceToCny: Record<SourceCurrency, number> = {
      CNY: 1, USD: 7.2, VND: 1 / 3800, EUR: 7.8, GBP: 9.1,
      CAD: 5.2, AUD: 4.7, JPY: 0.05, INR: 0.086, BRL: 1.32,
      MXN: 0.4, SEK: 0.75, PLN: 1.85, SGD: 5.6, AED: 1.96,
      SAR: 1.92, TRY: 0.17
    };
    const rate = sourceToCny[originalCurrency] || 1;
    if (rate !== 1) {
      minPriceCNY = Math.round(originalMin * rate * 10) / 10;
      maxPriceCNY = Math.round(originalMax * rate * 10) / 10;
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
    const schemaProduct = readSchemaProduct();
    const schemaBrand = typeof schemaProduct?.brand === "string" ? schemaProduct.brand : schemaProduct?.brand?.name;
    const schemaSeller = typeof schemaProduct?.seller === "string" ? schemaProduct.seller : schemaProduct?.seller?.name;
    const schemaShop = String(schemaSeller || schemaBrand || "").trim();
    if (schemaShop.length > 1) {
      return {
        shopId: `shop_${productId}`,
        shopName: schemaShop,
        shopUrl: window.location.origin
      };
    }
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
      ".shop-head-info a",
      // Etsy seller/shop name
      "a[href*='/shop/']",
      "[data-shop-name]",
      // Amazon brand/seller blocks
      "#bylineInfo",
      "#sellerProfileTriggerId",
      "#merchant-info"
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
    const specItems = document.querySelectorAll(".specification-item, .attribute-item, .params-item, .ItemProperties--item--1h9e3lA, #productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr, #technicalSpecifications_section_1 tr, [data-selector='listing-details'] li, .wt-list-unstyled li");
    specItems.forEach(item => {
      const cells = Array.from(item.querySelectorAll("th, td"));
      const label = item.querySelector(".label, .key, .name")?.textContent?.trim() || cells[0]?.textContent?.trim();
      const val = item.querySelector(".value, .val")?.textContent?.trim() || cells[1]?.textContent?.trim() || (cells.length === 1 ? cells[0]?.textContent?.trim()?.split(/:\s*/).slice(1).join(": ") : undefined);
      if (label && val) {
        attrs.push({ nameCN: label, valueCN: val });
      }
    });

    return attrs.slice(0, 10);
  }

  private static extractPersonalizationMetadata(): {
    customOptionGroups: SourceOptionGroup[];
    customizationEvidence: CustomizationEvidence;
  } {
    const groupSelector = [
      "#custom-options .ant-form-item",
      ".personalized-form .ant-form-item",
      "[data-personalization] .ant-form-item",
      "#customily-options .customily_option",
      ".customily-main-app .customily_option"
    ].join(", ");
    const rootSelector = "#custom-options, .personalized-form, [data-personalization], #customily-options, .customily-main-app";
    const customOptionGroups: SourceOptionGroup[] = [];
    const seenGroupNames = new Set<string>();
    const slugify = (value: string, fallback: string) => {
      const slug = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      return slug || fallback;
    };
    const normalizeImageUrl = (value: string | null | undefined): string | undefined => {
      if (!value) return undefined;
      let image = value.trim();
      if (!image || image.startsWith("data:") || image.startsWith("blob:")) return undefined;
      if (image.startsWith("//")) image = `https:${image}`;
      try { return new URL(image, window.location.href).href; } catch { return undefined; }
    };
    const inferImageLabel = (imageUrl?: string): string => {
      if (!imageUrl) return "";
      try {
        const fileName = (new URL(imageUrl, window.location.href).pathname.split("/").pop() || "")
          .replace(/%20/gi, " ")
          .replace(/\.[a-z0-9]+$/i, "");
        const semanticPart = fileName.includes("__") ? fileName.split("__").pop() || "" : fileName;
        return semanticPart
          .replace(/[_-]\d{6,}$/g, "")
          .replace(/[_-]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      } catch {
        return "";
      }
    };
    const readImageUrl = (element: Element): string | undefined => {
      const image = element.querySelector("img") as HTMLImageElement | null;
      const direct = image?.getAttribute("data-src") || image?.getAttribute("data-original") || image?.getAttribute("src");
      if (direct) return normalizeImageUrl(direct);
      const styled = (element.querySelector("[style*='background-image']") || element) as HTMLElement | null;
      const match = styled?.getAttribute("style")?.match(/background-image\s*:\s*url\(["']?([^"')]+)["']?\)/i);
      return normalizeImageUrl(match?.[1]);
    };

    document.querySelectorAll(groupSelector).forEach((container, groupIndex) => {
      const labelEl = container.querySelector(".option_name, .ant-form-item-label label, .pb-form-item-label, [data-option-label], legend, label");
      const name = (labelEl?.getAttribute("title") || labelEl?.textContent || "")
        .replace(/\(\s*\d+\s*[|/]\s*\d+\s*\)/g, "")
        .replace(/\brequired\b/gi, "")
        .replace(/\*/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!name || (/quantity|buy more|shipping/i.test(name) && !/choose|option|design|style/i.test(name))) return;

      const values: SourceOptionGroup["values"] = [];
      const controls = Array.from(container.querySelectorAll(
        ".customily-swatch, .swatch-container .pb-tooltip, .swatch-container > div, [role=option], [role=radio], input[type=radio], input[type=checkbox], select option"
      ));
      controls.forEach(control => {
        const input = (control.tagName === "INPUT" ? control : control.querySelector("input")) as HTMLInputElement | null;
        const image = control.querySelector("img") as HTMLImageElement | null;
        const imageUrl = readImageUrl(control);
        const valueLabel = control.querySelector(".pb-tooltip-title, [data-value-label]");
        const label = (
          control.getAttribute("data-value") ||
          control.getAttribute("title") ||
          control.getAttribute("aria-label") ||
          valueLabel?.textContent ||
          input?.getAttribute("aria-label") ||
          input?.value ||
          image?.getAttribute("alt") ||
          image?.getAttribute("title") ||
          inferImageLabel(imageUrl) ||
          control.textContent ||
          ""
        ).replace(/\s+/g, " ").trim();
        if (!label || values.some(value => value.label.toLowerCase() === label.toLowerCase())) return;
        values.push({
          id: `${slugify(name, "custom")}-${values.length + 1}`,
          label,
          sourceValue: input?.value || control.getAttribute("data-value") || label,
          imageUrl
        });
      });

      if (values.length > 0 && !seenGroupNames.has(name.toLowerCase())) {
        seenGroupNames.add(name.toLowerCase());
        const hasAssets = values.some(value => Boolean(value.imageUrl));
        const isRequired = container.querySelector("[required], [aria-required='true']") !== null ||
          labelEl?.textContent?.includes("*") === true;
        customOptionGroups.push({
          id: `custom-${slugify(name, String(groupIndex + 1))}`,
          name,
          kind: "PERSONALIZATION",
          inputType: hasAssets ? "ASSET_PICKER" : "SELECT",
          required: isRequired,
          source: "EXTERNAL_CUSTOMIZER",
          values
        });
      }
    });

    const textFields: NonNullable<CustomizationEvidence["textFields"]> = [];
    const detectedLabels: string[] = [];
    const seenFieldIds = new Set<string>();
    document.querySelectorAll(rootSelector).forEach(root => {
      root.querySelectorAll("input[type=text], input:not([type]), textarea, input[type=file]").forEach((control, index) => {
        const input = control as HTMLInputElement;
        const fieldContainer = input.closest(".ant-form-item, .customily_option, [data-personalization-field]") || input.parentElement;
        const labelEl = fieldContainer?.querySelector(".option_name, .ant-form-item-label label, label, legend, [data-option-label]");
        const label = (labelEl?.textContent || input.getAttribute("aria-label") || input.getAttribute("placeholder") || "Nội dung cá nhân hóa")
          .replace(/\*/g, "").replace(/\s+/g, " ").trim();
        const id = input.id || input.name || `${slugify(label, "custom-field")}-${index + 1}`;
        if (!seenFieldIds.has(id)) {
          seenFieldIds.add(id);
          const type = input.type === "file" ? "IMAGE_UPLOAD" : input.tagName.toLowerCase() === "textarea" ? "TEXTAREA" : "TEXT";
          textFields.push({
            id,
            label,
            type,
            required: input.required || input.getAttribute("aria-required") === "true" || fieldContainer?.querySelector("[required]") !== null,
            maxLength: input.maxLength > 0 ? input.maxLength : undefined,
            accept: input.accept ? input.accept.split(",").map(value => value.trim()).filter(Boolean) : undefined
          });
          if (label && !detectedLabels.includes(label)) detectedLabels.push(label);
        }
      });
    });

    // Etsy renders personalization inputs outside the generic customizer
    // wrappers. Its stable ids let us capture upload/text requirements without
    // classifying them as commercial SKU axes.
    if (detectProductPlatform(window.location.href) === "ETSY") {
      const etsyControls = Array.from(document.querySelectorAll("textarea[id^='perso-input-'], input[id^='perso-input-'], input[id^='file-input-']")) as HTMLInputElement[];
      etsyControls.forEach((control, index) => {
        const label = (
          document.querySelector(`label[for='${CSS.escape(control.id)}']`)?.textContent ||
          control.getAttribute("aria-label") ||
          control.getAttribute("placeholder") ||
          control.closest("div")?.querySelector("label, legend")?.textContent ||
          (control.type === "file" ? "Tải ảnh cá nhân hóa" : `Nội dung cá nhân hóa ${index + 1}`)
        ).replace(/\*/g, "").replace(/\s+/g, " ").trim();
        if (seenFieldIds.has(control.id)) return;
        seenFieldIds.add(control.id);
        textFields.push({
          id: control.id,
          label,
          type: control.type === "file" ? "IMAGE_UPLOAD" : control.tagName.toLowerCase() === "textarea" ? "TEXTAREA" : "TEXT",
          required: control.required || control.getAttribute("aria-required") === "true",
          maxLength: control.maxLength > 0 ? control.maxLength : undefined,
          accept: control.accept ? control.accept.split(",").map(value => value.trim()).filter(Boolean) : undefined
        });
        if (label && !detectedLabels.includes(label)) detectedLabels.push(label);
      });
      document.querySelectorAll("select[id^='perso-dropdown-']").forEach((select, index) => {
        const label = (select.getAttribute("aria-labelledby") || "").split(/\s+/)
          .map(id => document.getElementById(id)?.textContent || "").filter(Boolean).join(" ")
          .replace(/\(\s*optional\s*\)/i, "").replace(/\s+/g, " ").trim() || `Tùy chọn cá nhân hóa ${index + 1}`;
        const values = Array.from((select as HTMLSelectElement).options)
          .filter(option => option.value && !/select|choose|please select|chọn/i.test(option.textContent || ""))
          .map((option, valueIndex) => ({
            id: `${slugify(label, "custom")}-${valueIndex + 1}`,
            label: (option.textContent || option.value).replace(/\s+/g, " ").trim(),
            sourceValue: option.value
          }));
        if (values.length > 0 && !customOptionGroups.some(group => group.name.toLowerCase() === label.toLowerCase())) {
          customOptionGroups.push({
            id: `custom-${slugify(label, String(customOptionGroups.length + 1))}`,
            name: label,
            kind: "PERSONALIZATION",
            inputType: "SELECT",
            required: false,
            source: "EXTERNAL_CUSTOMIZER",
            values
          });
        }
      });
    }

    return {
      customOptionGroups,
      customizationEvidence: {
        hasCustomTextInput: textFields.some(field => field.type === "TEXT" || field.type === "TEXTAREA"),
        hasImageUpload: textFields.some(field => field.type === "IMAGE_UPLOAD"),
        hasCustomerAssetPicker: customOptionGroups.some(group => group.inputType === "ASSET_PICKER"),
        detectedLabels,
        textFields,
        confidence: customOptionGroups.length > 0 || textFields.length > 0 ? 0.95 : 0,
        reviewRequired: false
      }
    };
  }

  /**
   * Capture native marketplace variation controls without pretending that a
   * cartesian combination is a verified provider SKU. Etsy exposes variation
   * popovers while Amazon usually renders swatch buttons inside #twister; both
   * are useful to show in the draft even when no SKU/stock matrix is public.
   */
  private static extractNativeOptionGroups(platform: SourcePlatform): SourceOptionGroup[] {
    const groups: SourceOptionGroup[] = [];
    const seen = new Set<string>();
    const slugify = (value: string, fallback: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || fallback;
    const normalizeImage = (value: string | null | undefined): string | undefined => {
      if (!value) return undefined;
      let raw = value.trim();
      if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) return undefined;
      if (raw.startsWith("//")) raw = `https:${raw}`;
      try { return new URL(raw, window.location.href).href; } catch { return undefined; }
    };
    const readControlImage = (control: Element): string | undefined => {
      const img = control.querySelector("img") as HTMLImageElement | null;
      const direct = img?.getAttribute("data-old-hires") || img?.getAttribute("data-zoom-image") || img?.getAttribute("data-src") || img?.getAttribute("src") ||
        control.getAttribute("data-img-url") || control.getAttribute("data-image-url");
      if (direct) return normalizeImage(direct);
      const styled = (control.querySelector("[style*='background-image']") || control) as HTMLElement;
      const style = styled.getAttribute("style") || "";
      const match = style.match(/background-image\s*:\s*url\(["']?([^"')]+)["']?\)/i);
      return normalizeImage(match?.[1]);
    };
    const cleanLabel = (value: string): string => value.replace(/\s+/g, " ").replace(/[\u2022*]/g, "").trim();
    const cleanAmazonValue = (value: string): string => cleanLabel(value)
      .replace(/\s+\d+\s+options?\s+from\s+.+$/i, "")
      .replace(/\s+from\s+(?:[€£$¥₹₺]|R\$|S\$|CA\$|A\$).+$/i, "")
      .trim();
    const addGroup = (nameValue: string, controls: Element[], select?: HTMLSelectElement) => {
      const name = cleanLabel(nameValue).replace(/^(select|choose)\s+/i, "").trim();
      if (!name || /^(quantity|số lượng)$/i.test(name) || seen.has(name.toLowerCase())) return;
      const values: SourceOptionGroup["values"] = [];
      const pushValue = (labelValue: string, imageUrl?: string, sourceValue?: string) => {
        const label = cleanLabel(labelValue);
        if (!label || /^(select|choose|please select|chọn)$/i.test(label)) return;
        if (values.some(item => item.label.toLowerCase() === label.toLowerCase())) return;
        values.push({
          id: `${slugify(name, "variation")}-${values.length + 1}`,
          label,
          sourceValue: sourceValue || label,
          imageUrl
        });
      };
      if (select) {
        Array.from(select.options).forEach(option => pushValue(option.textContent || option.value, normalizeImage(option.getAttribute("data-image") || option.getAttribute("data-src")), option.value));
      }
      controls.forEach(control => {
        const imageUrl = readControlImage(control);
        const rawLabel = control.getAttribute("aria-label") || control.getAttribute("data-value") || control.getAttribute("title") ||
          control.querySelector(".a-size-base, .a-button-text, [data-value-label]")?.textContent ||
          (control as HTMLInputElement).value || control.textContent || "";
        const label = platform === "AMAZON" ? cleanAmazonValue(rawLabel) : rawLabel;
        pushValue(label, imageUrl, control.getAttribute("data-asin") || control.getAttribute("data-value") || undefined);
      });
      if (values.length < 1) return;
      seen.add(name.toLowerCase());
      groups.push({
        id: `variation-${slugify(name, String(groups.length + 1))}`,
        name,
        kind: "VARIATION",
        inputType: values.some(value => Boolean(value.imageUrl)) ? "COLOR_SWATCH" : "SELECT",
        required: true,
        source: "DOM",
        values: values.slice(0, 100)
      });
    };

    // Native <select> controls (common on Etsy localized/fallback markup).
    document.querySelectorAll("select[name*='variation' i], select[id*='variation' i], select[data-selector*='variation' i]").forEach((element) => {
      const select = element as HTMLSelectElement;
      const root = select.closest("fieldset, .wt-validation, [data-buy-box-region], form") || select.parentElement;
      const ariaLabel = select.getAttribute("aria-labelledby")?.split(/\s+/).map(id => document.getElementById(id)?.textContent || "").filter(Boolean).join(" ");
      const label = root?.querySelector("label, legend, [data-option-label]")?.textContent || ariaLabel || select.getAttribute("aria-label") || select.name || "Variation";
      addGroup(label, [], select);
    });

    if (platform === "ETSY") {
      document.querySelectorAll("button[id^='variation-selector-'], [data-selector='listing-page-variation-select']").forEach(button => {
        const root = button.parentElement;
        const controls = Array.from(root?.querySelectorAll("[role='option'], [role='menuitem'], option, [data-value]") || []);
        const label = root?.querySelector("label, legend, [data-option-label]")?.textContent ||
          button.getAttribute("aria-label") || button.textContent || `Variation ${groups.length + 1}`;
        addGroup(label, controls);
      });
    }

    if (platform === "AMAZON") {
      const amazonGroupSelector = [
        "#twister [role='radiogroup']",
        "#twister [id^='variation_']",
        "#twister-plus-inline-twister [id^='inline-twister-row-']",
        "[id^='inline-twister-row-']"
      ].join(", ");
      document.querySelectorAll(amazonGroupSelector).forEach(root => {
        const controls = Array.from(root.querySelectorAll("[role='radio'], input[type='radio'], li[data-asin], button[data-asin]"));
        const inferredName = root.id.replace(/^inline-twister-row-/, "").replace(/_name$/, "").replace(/[_-]+/g, " ");
        const headerText = root.querySelector("[id^='inline-twister-expander-header-'], .a-form-label, .a-row.a-spacing-micro")?.textContent || "";
        const label = headerText.split(":")[0] || root.getAttribute("aria-label") || inferredName || `Variation ${groups.length + 1}`;
        addGroup(label, controls);
      });

      // Singleton dimensions are displayed as plain text rather than radios.
      document.querySelectorAll("#twister-plus-inline-twister [id^='inline-twister-singleton-header-'], [id^='inline-twister-singleton-header-']").forEach(root => {
        const text = cleanLabel(root.textContent || "");
        const [name, ...valueParts] = text.split(":");
        const value = valueParts.join(":").trim();
        if (name && value) {
          const synthetic = document.createElement("span");
          synthetic.setAttribute("data-value", value);
          addGroup(name, [synthetic]);
        }
      });
    }

    return groups.slice(0, 3);
  }

  private static extractVariants(
    platform: SourcePlatform,
    productId: string,
    basePriceCNY: number,
    currency: SourceCurrency = "USD"
  ): {
    skuProps: Raw1688SkuProp[];
    skuMap: Record<string, Raw1688SkuItem>;
  } {
    // Approximate source-currency conversion used for imported SKU prices.
    // The product-level price is still the source of truth; this conversion
    // only keeps variant prices consistent with the app's CNY pricing model.
    const sourceToCny: Record<SourceCurrency, number> = {
      CNY: 1,
      USD: 7.2,
      VND: 1 / 3800,
      EUR: 7.8,
      GBP: 9.1,
      CAD: 5.2,
      AUD: 4.7,
      JPY: 0.05,
      INR: 0.086,
      BRL: 1.32,
      MXN: 0.4,
      SEK: 0.75,
      PLN: 1.85,
      SGD: 5.6,
      AED: 1.96,
      SAR: 1.92,
      TRY: 0.17
    };
    const toCny = (price: number) => {
      if (!Number.isFinite(price) || price <= 0) return basePriceCNY;
      const rate = sourceToCny[currency] || 1;
      return Math.round(price * rate * 10) / 10;
    };

    // Etsy/Amazon do not expose a stable public SKU/stock matrix in the page.
    // Their visible choices are retained in optionGroups; never turn unrelated
    // hydration JSON into sellable SKUs.
    const canTrustEmbeddedVariantArray = platform !== "ETSY" && platform !== "AMAZON";

    // 1. Thử quét variants từ thẻ script application/json (Shopify Dawn / 2.0 / WooCommerce)
    let parsedVariants: any[] = [];
    try {
      if (!canTrustEmbeddedVariantArray) throw new Error("MARKETPLACE_OPTIONS_ONLY");
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

          const inventory = getSourceInventoryState(v);
          const skuItem: Raw1688SkuItem = {
            skuId: String(v.id),
            attributes: {
              "Kích thước": v.option1 || "",
              "Quy cách": v.option2 || ""
            },
            priceCNY: vPriceCNY > 0 ? vPriceCNY : basePriceCNY,
            stock: inventory.stock,
            available: inventory.available,
            inventoryTracked: inventory.inventoryTracked,
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

          const inventory = getSourceInventoryState(v);
          const skuItem: Raw1688SkuItem = {
            skuId: String(v.id),
            attributes: { "Phân loại": v.title || v.name || "Phân loại" },
            priceCNY: vPriceCNY > 0 ? vPriceCNY : basePriceCNY,
            stock: inventory.stock,
            available: inventory.available,
            inventoryTracked: inventory.inventoryTracked,
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
