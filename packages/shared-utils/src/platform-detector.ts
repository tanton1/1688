import { SourceCurrency, SourcePlatform, SupportedPlatformInfo } from "@hub1688/shared-types";

export const SUPPORTED_PLATFORMS_META: SupportedPlatformInfo[] = [
  {
    id: "1688",
    name: "1688 B2B",
    badge: "1688 Wholesale",
    icon: "🇨🇳",
    color: "#ff6000",
    defaultCurrency: "CNY",
    sampleUrl: "https://detail.1688.com/offer/684219482103.html",
    description: "Sàn B2B Trung Quốc; cần xác minh nhà cung cấp, giá và điều kiện giao dịch"
  },
  {
    id: "TAOBAO",
    name: "Taobao C2C",
    badge: "Taobao Retail",
    icon: "🛍️",
    color: "#ff5000",
    defaultCurrency: "CNY",
    sampleUrl: "https://item.taobao.com/item.htm?id=681928471928",
    description: "Sàn bán lẻ nội địa Trung Quốc với dữ liệu sản phẩm bằng tiếng Trung"
  },
  {
    id: "TMALL",
    name: "Tmall Mall",
    badge: "Tmall Official",
    icon: "💎",
    color: "#ff0036",
    defaultCurrency: "CNY",
    sampleUrl: "https://detail.tmall.com/item.htm?id=712938491024",
    description: "Sàn bán lẻ nội địa Trung Quốc; trạng thái thương hiệu cần được xác minh theo từng gian hàng"
  },
  {
    id: "SHOPEE",
    name: "Shopee SEA",
    badge: "Shopee Mall",
    icon: "🧡",
    color: "#ee4d2d",
    defaultCurrency: "VND",
    sampleUrl: "https://shopee.vn/product/12345678/987654321",
    description: "Sàn thương mại điện tử tại Việt Nam và Đông Nam Á"
  },
  {
    id: "TIKTOK_SHOP",
    name: "TikTok Shop",
    badge: "TikTok Commerce",
    icon: "🎵",
    color: "#000000",
    defaultCurrency: "VND",
    sampleUrl: "https://shop.tiktok.com/view/product/1729384918294",
    description: "Nền tảng mua sắm qua video ngắn và livestream"
  },
  {
    id: "ALIEXPRESS",
    name: "AliExpress",
    badge: "AliExpress Global",
    icon: "🌐",
    color: "#e62e04",
    defaultCurrency: "USD",
    sampleUrl: "https://www.aliexpress.com/item/1005004819283746.html",
    description: "Nền tảng bán lẻ toàn cầu của Alibaba, giá USD và thông số tiếng Anh"
  },
  {
    id: "ETSY",
    name: "Etsy",
    badge: "Etsy Marketplace",
    icon: "🧶",
    color: "#f1641e",
    defaultCurrency: "USD",
    sampleUrl: "https://www.etsy.com/listing/1234567890/sample-personalized-gift",
    description: "Marketplace đồ thủ công và quà cá nhân hóa; addon lấy listing ID, media, giá, shop và lựa chọn công khai"
  },
  {
    id: "AMAZON",
    name: "Amazon",
    badge: "Amazon Marketplace",
    icon: "📦",
    color: "#ff9900",
    defaultCurrency: "USD",
    sampleUrl: "https://www.amazon.com/dp/B0ABCDE123",
    description: "Amazon quốc tế; addon lấy ASIN, media, giá, thương hiệu và lựa chọn đang hiển thị trên trang"
  },
  {
    id: "GENERIC_WEB",
    name: "Website Bất Kỳ",
    badge: "Universal Web",
    icon: "🔗",
    color: "#4f46e5",
    defaultCurrency: "VND",
    sampleUrl: "https://cottonon.com/VN/p/oversized-crew-tee/123456.html",
    description: "Shopify, WooCommerce, Lazada, Amazon hoặc bất kỳ website bán hàng nào"
  }
];

/**
 * Tự động nhận diện nền tảng nguồn từ URL sản phẩm
 */
export function detectProductPlatform(url: string): SourcePlatform {
  if (!url || typeof url !== "string") return "GENERIC_WEB";
  const lower = url.toLowerCase().trim();

  if (lower.includes("1688.com")) return "1688";
  if (lower.includes("tmall.com")) return "TMALL";
  if (lower.includes("taobao.com")) return "TAOBAO";
  if (lower.includes("shopee.vn") || lower.includes("shopee.com") || lower.includes("shopee.co")) return "SHOPEE";
  if (lower.includes("tiktok.com") || lower.includes("shop.tiktok.com")) return "TIKTOK_SHOP";
  if (lower.includes("aliexpress.com")) return "ALIEXPRESS";
  if (/(?:^|\.)etsy\.com(?::|\/|$)/i.test(lower.replace(/^https?:\/\//, ""))) return "ETSY";
  if (/(?:^|\.)amazon\.(?:com|ca|com\.mx|com\.br|co\.uk|de|fr|it|es|nl|se|pl|com\.be|co\.jp|in|com\.au|sg|ae|sa|com\.tr)(?::|\/|$)/i.test(lower.replace(/^https?:\/\//, ""))) return "AMAZON";

  return "GENERIC_WEB";
}

/**
 * Bóc tách mã định danh sản phẩm (Source Product ID) từ URL
 */
export function extractProductIdFromUrl(url: string, platform?: SourcePlatform): string {
  if (!url) return "";
  const targetPlatform = platform || detectProductPlatform(url);

  try {
    const parsed = new URL(url);

    if (targetPlatform === "1688") {
      const match = url.match(/offer\/(\d+)\.html/);
      if (match) return match[1];
    }

    if (targetPlatform === "TAOBAO" || targetPlatform === "TMALL") {
      const idParam = parsed.searchParams.get("id");
      if (idParam) return idParam;
    }

    if (targetPlatform === "SHOPEE") {
      const pMatch = url.match(/product\/\d+\/(\d+)/);
      if (pMatch) return pMatch[1];
      const iMatch = url.match(/-i\.\d+\.(\d+)/);
      if (iMatch) return iMatch[1];
    }

    if (targetPlatform === "TIKTOK_SHOP") {
      const match = url.match(/product\/(\d+)/);
      if (match) return match[1];
    }

    if (targetPlatform === "ALIEXPRESS") {
      const match = url.match(/item\/(\d+)\.html/);
      if (match) return match[1];
    }

    if (targetPlatform === "ETSY") {
      const match = parsed.pathname.match(/\/listing\/(\d+)/i);
      if (match) return match[1];
      const listingId = parsed.searchParams.get("listing_id");
      if (listingId && /^\d+$/.test(listingId)) return listingId;
    }

    if (targetPlatform === "AMAZON") {
      const match = parsed.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d|product)\/([A-Z0-9]{10})(?:[/?]|$)/i);
      if (match) return match[1].toUpperCase();
      const asin = parsed.searchParams.get("asin") || parsed.searchParams.get("ASIN");
      if (asin && /^[A-Z0-9]{10}$/i.test(asin)) return asin.toUpperCase();
    }

    // Generic Web: lấy slug hoặc path cuối cùng
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1].replace(/\.[^/.]+$/, "");
      if (lastPart.length > 2) return lastPart;
    }
  } catch {
    const idMatch = url.match(/(\d{7,20})/);
    if (idMatch) return idMatch[1];
  }

  // Generic pages do not always expose a provider product ID. Use a stable,
  // URL-derived identifier instead of inventing a different ID on every scan.
  let hash = 2166136261;
  for (let index = 0; index < url.length; index += 1) {
    hash ^= url.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `url_${(hash >>> 0).toString(36)}`;
}

export interface ExtractedHtmlMetadata {
  title?: string;
  description?: string;
  images: string[];
  detailImages?: string[];
  price?: number;
  priceMin?: number;
  priceMax?: number;
  currency?: SourceCurrency;
  brand?: string;
  schemaProduct?: any;
  options?: Array<{ name: string; values: string[] }>;
  variants?: Array<any>;
}

function jsonLdHasType(value: unknown, expected: string): boolean {
  const types = Array.isArray(value) ? value : [value];
  return types.some(type => String(type || "").toLowerCase() === expected.toLowerCase());
}

function findJsonLdProduct(value: any, seen = new Set<any>()): any | null {
  if (!value || typeof value !== "object" || seen.has(value)) return null;
  seen.add(value);
  if (jsonLdHasType(value["@type"], "Product")) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const product = findJsonLdProduct(item, seen);
      if (product) return product;
    }
    return null;
  }
  for (const nested of [value["@graph"], value.mainEntity, value.itemListElement]) {
    const product = findJsonLdProduct(nested, seen);
    if (product) return product;
  }
  return null;
}

function appendJsonLdImages(target: string[], imageValue: any): void {
  const values = Array.isArray(imageValue) ? imageValue : [imageValue];
  for (const item of values) {
    const raw = typeof item === "string" ? item : item?.url || item?.contentUrl || item?.contentURL;
    if (typeof raw !== "string" || !raw.trim()) continue;
    const normalized = raw.trim().startsWith("//") ? `https:${raw.trim()}` : raw.trim();
    if (/^https?:\/\//i.test(normalized) && !target.includes(normalized)) target.push(normalized);
  }
}

function normalizeHtmlImageUrl(value: string): string | null {
  let normalized = decodeHtmlEntities(value).trim();
  if (!normalized || /^(?:data|blob):/i.test(normalized)) return null;
  if (normalized.startsWith("//")) normalized = `https:${normalized}`;
  if (normalized.startsWith("http://")) normalized = `https://${normalized.slice(7)}`;
  if (!/^https?:\/\//i.test(normalized)) return null;
  return normalized.replace(/_([0-9]+x[0-9]*|small|compact|medium|large|grande|pico)(\.[a-zA-Z0-9]+)/, "$2");
}

/**
 * Read lazy-loaded and responsive image attributes without silently keeping a
 * thumbnail. A single <img> contributes its highest-resolution srcset entry;
 * distinct <img> elements remain distinct and are not capped.
 */
function appendHtmlImageCandidates(target: string[], markup: string): void {
  const tagRegex = /<img\b[^>]*>/gi;
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = tagRegex.exec(markup)) !== null) {
    const tag = tagMatch[0];
    const candidates: Array<{ url: string; width: number; priority: number }> = [];
    const attrs: Array<{ name: string; priority: number }> = [
      { name: "data-zoom-image", priority: 7 },
      { name: "data-original", priority: 6 },
      { name: "data-lazyload-src", priority: 5 },
      { name: "data-lazy-src", priority: 4 },
      { name: "data-src", priority: 3 },
      { name: "src", priority: 1 }
    ];
    for (const attr of attrs) {
      const match = tag.match(new RegExp(`\\b${attr.name}=["']([^"']+)["']`, "i"));
      const url = match ? normalizeHtmlImageUrl(match[1]) : null;
      if (url) candidates.push({ url, width: 0, priority: attr.priority });
    }
    for (const attrName of ["data-srcset", "srcset"]) {
      const match = tag.match(new RegExp(`\\b${attrName}=["']([^"']+)["']`, "i"));
      if (!match) continue;
      match[1].split(",").forEach((entry, index) => {
        const parts = entry.trim().split(/\s+/);
        const url = normalizeHtmlImageUrl(parts[0] || "");
        const descriptor = parts[1] || "";
        const width = descriptor.endsWith("w") ? Number.parseInt(descriptor, 10) : descriptor.endsWith("x") ? Number.parseFloat(descriptor) * 1_000 : index;
        if (url) candidates.push({ url, width: Number.isFinite(width) ? width : 0, priority: 8 });
      });
    }
    const selected = candidates.sort((a, b) => b.width - a.width || b.priority - a.priority)[0]?.url;
    if (selected && !target.includes(selected)) target.push(selected);
  }
}

function readJsonLdOffers(offersValue: any): { prices: number[]; currency?: SourceCurrency } {
  const prices: number[] = [];
  let currency: SourceCurrency | undefined;
  const visit = (value: any) => {
    if (!value) return;
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (typeof value !== "object") return;
    const specifications = Array.isArray(value.priceSpecification) ? value.priceSpecification : [value.priceSpecification];
    for (const candidate of [
      value.price,
      value.lowPrice,
      value.highPrice,
      ...specifications.flatMap((spec: any) => [spec?.price, spec?.minPrice, spec?.maxPrice])
    ]) {
      const parsed = Number.parseFloat(String(candidate ?? "").replace(/,/g, ""));
      if (Number.isFinite(parsed) && parsed > 0) prices.push(parsed);
    }
    const declaredCurrency = String(
      value.priceCurrency || specifications.find((spec: any) => spec?.priceCurrency)?.priceCurrency || ""
    ).toUpperCase();
    if (["USD", "VND", "CNY", "EUR", "GBP", "CAD", "AUD", "JPY", "INR", "BRL", "MXN", "SEK", "PLN", "SGD", "AED", "SAR", "TRY"].includes(declaredCurrency)) {
      currency = declaredCurrency as SourceCurrency;
    }
    if (value.offers && value.offers !== value) visit(value.offers);
  };
  visit(offersValue);
  return { prices, currency };
}

/**
 * Trích xuất OpenGraph, Meta tags, Shopify JSON và JSON-LD Schema.org từ nội dung HTML
 */
export function parseHtmlProductMetadata(html: string): ExtractedHtmlMetadata {
  const result: ExtractedHtmlMetadata = {
    images: [],
    detailImages: []
  };

  if (!html || typeof html !== "string") return result;

  // 1. Thử trích xuất Shopify Product JSON nhúng (Thường có trong <script id="ProductJson-..."> hoặc data-product-json)
  try {
    const shopifyJsonRegex = /<script\b[^>]*\b(?:id=["']ProductJson-[^"']*["']|data-product-json|class=["'][^"']*product-json[^"']*["'])[^>]*>([\s\S]*?)<\/script>/i;
    const shopifyMatch = html.match(shopifyJsonRegex);
    let shopifyData: any = null;

    if (shopifyMatch) {
      try {
        shopifyData = JSON.parse(shopifyMatch[1]);
      } catch {}
    }

    if (!shopifyData) {
      // Regex quét biến product = {...} hoặc "product": {"id":...}
      const rawProductMatch = html.match(/(?:window\.product\s*=\s*|var\s+product\s*=\s*)(\{[\s\S]*?"title":[\s\S]*?"variants":\s*\[[\s\S]*?\});/i);
      if (rawProductMatch) {
        try {
          shopifyData = JSON.parse(rawProductMatch[1]);
        } catch {}
      }
    }

    if (shopifyData && shopifyData.title && Array.isArray(shopifyData.variants)) {
      result.title = shopifyData.title;
      result.brand = shopifyData.vendor || "Macorner";
      result.description = shopifyData.description || "";
      result.options = shopifyData.options;
      result.variants = shopifyData.variants;

      if (shopifyData.price) {
        result.price = shopifyData.price > 1000 ? shopifyData.price / 100 : shopifyData.price;
        result.priceMin = shopifyData.price_min ? (shopifyData.price_min > 1000 ? shopifyData.price_min / 100 : shopifyData.price_min) : result.price;
        result.priceMax = shopifyData.price_max ? (shopifyData.price_max > 1000 ? shopifyData.price_max / 100 : shopifyData.price_max) : result.price;
        result.currency = "USD";
      }

      if (Array.isArray(shopifyData.images) && shopifyData.images.length > 0) {
        shopifyData.images.forEach((img: any) => {
          let rawSrc = typeof img === "string" ? img : img?.src || "";
          let clean = rawSrc.trim();
          if (clean.startsWith("//")) clean = "https:" + clean;
          if (clean.startsWith("http://")) clean = clean.replace("http://", "https://");
          if (clean && !result.images.includes(clean)) result.images.push(clean);
        });
      }

      if (shopifyData.description || shopifyData.body_html) {
        appendHtmlImageCandidates(result.detailImages!, shopifyData.description || shopifyData.body_html);
      }
    }
  } catch {}

  // 1b. Trích xuất JSON mảng biến thể Shopify trong <script type="application/json"> (thường gặp ở theme Dawn / 2.0 như Macorner)
  if (!result.variants || result.variants.length === 0) {
    try {
      const jsonScriptsRegex = /<script\b[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
      let sMatch: RegExpExecArray | null;
      while ((sMatch = jsonScriptsRegex.exec(html)) !== null) {
        try {
          const parsed = JSON.parse(sMatch[1].trim());
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && (parsed[0].title || parsed[0].price !== undefined)) {
            result.variants = parsed;
            const prices = parsed
              .map(v => typeof v.price === "number" ? (v.price > 1000 ? v.price / 100 : v.price) : 0)
              .filter(p => p > 0);
            if (prices.length > 0) {
              result.priceMin = Math.min(...prices);
              result.priceMax = Math.max(...prices);
              if (!result.price) result.price = result.priceMin;
              if (!result.currency) result.currency = "USD";
            }

            // Lấy ảnh từ các biến thể nếu có
            parsed.forEach(v => {
              let img = v.featured_image?.src || (typeof v.featured_image === "string" ? v.featured_image : null);
              if (img) {
                if (img.startsWith("//")) img = "https:" + img;
                if (!result.images.includes(img)) result.images.push(img);
              }
            });

            // Tổng hợp options từ option1, option2, option3
            const opt1Vals = [...new Set(parsed.map(v => v.option1).filter(Boolean))] as string[];
            const opt2Vals = [...new Set(parsed.map(v => v.option2).filter(Boolean))] as string[];
            const opt3Vals = [...new Set(parsed.map(v => v.option3).filter(Boolean))] as string[];

            const labelMatches = [...html.matchAll(/<(?:legend|label)\b[^>]*class=["'][^"']*(?:form__label|label)[^"']*["'][^>]*>([^<]+)<\/(?:legend|label)>/gi)]
              .map(m => decodeHtmlEntities(m[1]).trim())
              .filter(l => l && !/quantity|số lượng|email|password/i.test(l));

            const options: Array<{ name: string; values: string[] }> = [];
            if (opt1Vals.length > 0) {
              options.push({
                name: labelMatches[0] || (opt1Vals.some(v => /"|cm|inch|size|[smlx]/i.test(v)) ? "Size" : "Option 1"),
                values: opt1Vals
              });
            }
            if (opt2Vals.length > 0) {
              options.push({
                name: labelMatches[1] || (opt2Vals.some(v => /pc|set|pack|combo/i.test(v)) ? "Buy More Save More" : "Option 2"),
                values: opt2Vals
              });
            }
            if (opt3Vals.length > 0) {
              options.push({
                name: labelMatches[2] || "Option 3",
                values: opt3Vals
              });
            }
            if (options.length > 0) {
              result.options = options;
            }
            break;
          }
        } catch {}
      }
    } catch {}
  }

  // 2. Trích xuất JSON-LD Schema.org
  const jsonLdRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonMatch: RegExpExecArray | null;
  while ((jsonMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      const jsonContent = jsonMatch[1].trim();
      const parsed = JSON.parse(jsonContent);
      const item = findJsonLdProduct(parsed);

      if (item) {
        result.schemaProduct = item;
        if (item.name) result.title = item.name;
        if (item.description) result.description = item.description;
        if (item.brand?.name) result.brand = item.brand.name;
        
        if (item.image) appendJsonLdImages(result.images, item.image);

        if (item.offers) {
          const offerData = readJsonLdOffers(item.offers);
          if (offerData.prices.length > 0) {
            result.price = Math.min(...offerData.prices);
            result.priceMin = Math.min(...offerData.prices);
            result.priceMax = Math.max(...offerData.prices);
          }
          if (offerData.currency) result.currency = offerData.currency;
        }
        break;
      }
    } catch {
      // Bỏ qua JSON không hợp lệ
    }
  }

  // 3. Trích xuất OpenGraph Meta Tags nếu chưa có từ JSON-LD
  const ogTitleMatch = html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i) ||
                       html.match(/<meta\b[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["']/i);
  if (!result.title && ogTitleMatch) {
    result.title = decodeHtmlEntities(ogTitleMatch[1]);
  }

  // Fallback <title> tag
  if (!result.title) {
    const titleTagMatch = html.match(/<title\b[^>]*>([^<]*)<\/title>/i);
    if (titleTagMatch) {
      result.title = decodeHtmlEntities(titleTagMatch[1]).split(/[-|–_]/)[0].trim();
    }
  }

  // OpenGraph Description
  const ogDescMatch = html.match(/<meta\b[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i) ||
                      html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
  if (!result.description && ogDescMatch) {
    result.description = decodeHtmlEntities(ogDescMatch[1]);
  }

  // OpenGraph Brand / Site Name
  const ogSiteNameMatch = html.match(/<meta\b[^>]*property=["']og:site_name["'][^>]*content=["']([^"']*)["']/i);
  if (!result.brand && ogSiteNameMatch) {
    result.brand = decodeHtmlEntities(ogSiteNameMatch[1]);
  }

  // OpenGraph Image
  const ogImageMatch = html.match(/<meta\b[^>]*property=["'](?:og:image:secure_url|og:image)["'][^>]*content=["']([^"']*)["']/i) ||
                       html.match(/<meta\b[^>]*content=["']([^"']*)["'][^>]*property=["'](?:og:image:secure_url|og:image)["']/i);
  if (ogImageMatch) {
    let imgUrl = ogImageMatch[1].trim();
    if (imgUrl.startsWith("//")) imgUrl = "https:" + imgUrl;
    if (imgUrl.startsWith("http://")) imgUrl = imgUrl.replace("http://", "https://");
    if (!result.images.includes(imgUrl)) {
      result.images.unshift(imgUrl);
    }
  }

  // OpenGraph Price
  const ogPriceMatch = html.match(/<meta\b[^>]*property=["']og:price:amount["'][^>]*content=["']([^"']*)["']/i) ||
                       html.match(/<meta\b[^>]*property=["']product:price:amount["'][^>]*content=["']([^"']*)["']/i);
  if (!result.price && ogPriceMatch) {
    const p = parseFloat(ogPriceMatch[1]);
    if (!isNaN(p) && p > 0) result.price = p;
  }

  const ogCurrMatch = html.match(/<meta\b[^>]*property=["']og:price:currency["'][^>]*content=["']([^"']*)["']/i) ||
                      html.match(/<meta\b[^>]*property=["']product:price:currency["'][^>]*content=["']([^"']*)["']/i);
  if (!result.currency && ogCurrMatch) {
    const c = ogCurrMatch[1].toUpperCase();
    if (["VND", "USD", "CNY", "EUR", "GBP", "CAD", "AUD", "JPY", "INR", "BRL", "MXN", "SEK", "PLN", "SGD", "AED", "SAR", "TRY"].includes(c)) {
      result.currency = c as SourceCurrency;
    }
  }

  // 4. Trích xuất ảnh chi tiết dài (Detail & Gallery Images) từ HTML content
  const allHtmlImages: string[] = [];
  appendHtmlImageCandidates(allHtmlImages, html);
  const detailImgs = allHtmlImages.filter(url => {
    // Filter obvious UI chrome while retaining product infographics and CDN
    // assets. `/assets/` alone is not junk: customizers often store artwork there.
    const isIgnored = /icon|logo|badge|pixel|tracking|avatar|spacer|\.gif\b|\.svg\b|recommend|related|cart|payment|trust|rating|review|halloween_badge|search-|img-menu|default-img|footer|header|menu/i.test(url);
    return !isIgnored && !result.images.includes(url);
  });
  result.detailImages = Array.from(new Set([...(result.detailImages || []), ...detailImgs]));

  if (result.images.length <= 1 && result.detailImages.length > 0) {
    for (const dImg of result.detailImages) {
      if (!result.images.includes(dImg)) {
        result.images.push(dImg);
      }
    }
  }

  return result;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}
