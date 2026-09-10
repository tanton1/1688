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
  currency?: "CNY" | "USD" | "VND";
  brand?: string;
  schemaProduct?: any;
}

/**
 * Trích xuất OpenGraph, Meta tags và JSON-LD Schema.org từ nội dung HTML
 */
export function parseHtmlProductMetadata(html: string): ExtractedHtmlMetadata {
  const result: ExtractedHtmlMetadata = {
    images: [],
    detailImages: []
  };

  if (!html || typeof html !== "string") return result;

  // 1. Trích xuất JSON-LD Schema.org
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

  // 2. Trích xuất OpenGraph Meta Tags nếu chưa có từ JSON-LD
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

  // OpenGraph Image
  const ogImageMatch = html.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i) ||
                       html.match(/<meta\b[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["']/i);
  if (ogImageMatch && !result.images.includes(ogImageMatch[1])) {
    result.images.unshift(ogImageMatch[1]);
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

  // 3. Trích xuất ảnh chi tiết dài (Detail & Size Chart Images) từ HTML content
  const imgRegex = /<img\b[^>]*\b(?:src|data-src|data-original)=["'](https?:\/\/[^"'\s>]+)["'][^>]*>/gi;
  let imgMatch: RegExpExecArray | null;
  const detailImgs: string[] = [];
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const url = imgMatch[1];
    // Loại trừ icon nhỏ, tracking pixel, file gif hoặc banner logo hệ thống
    const isIgnored = /icon|logo|badge|pixel|tracking|avatar|spacer|\.gif\b/i.test(url);
    if (!isIgnored && !result.images.includes(url) && !detailImgs.includes(url)) {
      detailImgs.push(url);
    }
  }
  result.detailImages = detailImgs.slice(0, 15);

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
