import { SourcePlatform, SupportedPlatformInfo } from "@hub1688/shared-types";

export const SUPPORTED_PLATFORMS_META: SupportedPlatformInfo[] = [
  {
    id: "1688",
    name: "1688 B2B",
    badge: "1688 Wholesale",
    icon: "🇨🇳",
    color: "#ff6000",
    defaultCurrency: "CNY",
    sampleUrl: "https://detail.1688.com/offer/684219482103.html",
    description: "Nguồn hàng tận xưởng Trung Quốc giá sỉ gốc Alibaba"
  },
  {
    id: "TAOBAO",
    name: "Taobao C2C",
    badge: "Taobao Retail",
    icon: "🛍️",
    color: "#ff5000",
    defaultCurrency: "CNY",
    sampleUrl: "https://item.taobao.com/item.htm?id=681928471928",
    description: "Sàn bán lẻ nội địa hàng đầu Trung Quốc, mẫu mã hot trend đa dạng"
  },
  {
    id: "TMALL",
    name: "Tmall Mall",
    badge: "Tmall Official",
    icon: "💎",
    color: "#ff0036",
    defaultCurrency: "CNY",
    sampleUrl: "https://detail.tmall.com/item.htm?id=712938491024",
    description: "Thương hiệu chính hãng cao cấp, chất lượng đảm bảo tiêu chuẩn Tmall"
  },
  {
    id: "SHOPEE",
    name: "Shopee SEA",
    badge: "Shopee Mall",
    icon: "🧡",
    color: "#ee4d2d",
    defaultCurrency: "VND",
    sampleUrl: "https://shopee.vn/product/12345678/987654321",
    description: "Sàn thương mại điện tử phổ biến nhất Việt Nam & Đông Nam Á"
  },
  {
    id: "TIKTOK_SHOP",
    name: "TikTok Shop",
    badge: "TikTok Commerce",
    icon: "🎵",
    color: "#000000",
    defaultCurrency: "VND",
    sampleUrl: "https://shop.tiktok.com/view/product/1729384918294",
    description: "Nền tảng mua sắm video ngắn & livestream xu hướng triệu view"
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

  return "GENERIC_WEB";
}

/**
 * Bóc tách mã định danh sản phẩm (Source Product ID) từ URL
 */
export function extractProductIdFromUrl(url: string, platform?: SourcePlatform): string {
  if (!url) return `ext_${Date.now()}`;
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

  return `clone_${Date.now()}`;
}

export interface ExtractedHtmlMetadata {
  title?: string;
  description?: string;
  images: string[];
  detailImages?: string[];
  price?: number;
  priceMin?: number;
  priceMax?: number;
  currency?: "CNY" | "USD" | "VND";
  brand?: string;
  schemaProduct?: any;
  options?: Array<{ name: string; values: string[] }>;
  variants?: Array<any>;
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
        const descHtml = shopifyData.description || shopifyData.body_html;
        const dImgRegex = /<img\b[^>]*\b(?:src|data-src)=["']((?:https?:)?\/\/[^"'\s>]+)["'][^>]*>/gi;
        let dm: RegExpExecArray | null;
        while ((dm = dImgRegex.exec(descHtml)) !== null) {
          let u = dm[1].trim();
          if (u.startsWith("//")) u = "https:" + u;
          if (u.startsWith("http://")) u = u.replace("http://", "https://");
          if (!result.detailImages!.includes(u)) result.detailImages!.push(u);
        }
      }

      if (result.images.length > 0) {
        return result;
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
      const item = Array.isArray(parsed) ? parsed.find(x => x["@type"] === "Product") : (parsed["@type"] === "Product" ? parsed : null);

      if (item) {
        result.schemaProduct = item;
        if (item.name) result.title = item.name;
        if (item.description) result.description = item.description;
        if (item.brand?.name) result.brand = item.brand.name;
        
        if (item.image) {
          if (Array.isArray(item.image)) {
            result.images.push(...item.image.filter((img: any) => typeof img === "string"));
          } else if (typeof item.image === "string") {
            result.images.push(item.image);
          }
        }

        if (item.offers) {
          const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          if (offers) {
            const rawPrice = parseFloat(offers.price || offers.lowPrice || "0");
            if (rawPrice > 0) result.price = rawPrice;
            const rawCurr = (offers.priceCurrency || "").toUpperCase();
            if (rawCurr === "VND" || rawCurr === "USD" || rawCurr === "CNY") {
              result.currency = rawCurr as any;
            }
          }
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
    if (c === "VND" || c === "USD" || c === "CNY") result.currency = c as any;
  }

  // 4. Trích xuất ảnh chi tiết dài (Detail & Gallery Images) từ HTML content
  const imgRegex = /<img\b[^>]*\b(?:src|data-src|data-original)=["']((?:https?:)?\/\/[^"'\s>]+)["'][^>]*>/gi;
  let imgMatch: RegExpExecArray | null;
  const detailImgs: string[] = [];
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    let url = imgMatch[1].trim();
    if (url.startsWith("//")) url = "https:" + url;
    if (url.startsWith("http://")) url = url.replace("http://", "https://");

    // Loại trừ icon nhỏ, tracking pixel, banner, logo, review stars, recommendation items
    const isIgnored = /icon|logo|badge|pixel|tracking|avatar|spacer|\.gif\b|\.svg\b|recommend|related|cart|payment|trust|rating|review|halloween_badge|search-|img-menu|default-img|footer|header|menu|\/assets\//i.test(url);
    if (!isIgnored && !result.images.includes(url) && !detailImgs.includes(url)) {
      const cleanUrl = url.replace(/_([0-9]+x[0-9]*|small|compact|medium|large|grande|pico)(\.[a-zA-Z0-9]+)/, "$2");
      detailImgs.push(cleanUrl);
    }
  }
  result.detailImages = detailImgs.slice(0, 15);

  if (result.images.length <= 1 && detailImgs.length > 0) {
    for (const dImg of detailImgs) {
      if (!result.images.includes(dImg)) {
        result.images.push(dImg);
      }
      if (result.images.length >= 8) break;
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
