import { SourcePlatform } from "@hub1688/shared-types";
import { detectProductPlatform, extractProductIdFromUrl } from "@hub1688/shared-utils";

export type PageType = "DETAIL" | "SEARCH" | "SHOP" | "UNKNOWN";

export interface DetectedCommercePage {
  platform: SourcePlatform;
  pageType: PageType;
  productId?: string;
  offerId?: string; // alias for 1688
  shopId?: string;
}

export function detectAnyCommercePage(url: string = window.location.href): DetectedCommercePage {
  const platform = detectProductPlatform(url);
  const productId = extractProductIdFromUrl(url, platform);

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const hostname = parsed.hostname;

    // 1. 1688
    if (platform === "1688") {
      if (pathname.includes("/offer/") || parsed.searchParams.get("offerId")) {
        return { platform, pageType: "DETAIL", productId, offerId: productId };
      }
      if (hostname.includes("s.1688.com") || pathname.includes("/selloffer/")) {
        return { platform, pageType: "SEARCH" };
      }
      if (pathname.includes("/page/offerlist") || hostname.match(/shop\d+\.1688\.com/)) {
        return { platform, pageType: "SHOP" };
      }
    }

    // 2. Taobao & Tmall
    if (platform === "TAOBAO" || platform === "TMALL") {
      if (parsed.searchParams.get("id") || pathname.includes("/item.htm")) {
        return { platform, pageType: "DETAIL", productId, offerId: productId };
      }
      if (hostname.includes("s.taobao.com")) return { platform, pageType: "SEARCH" };
      return { platform, pageType: "UNKNOWN", productId };
    }

    // 3. Shopee
    if (platform === "SHOPEE") {
      if (pathname.includes("-i.") || pathname.includes("/product/")) {
        return { platform, pageType: "DETAIL", productId, offerId: productId };
      }
      if (pathname.includes("/search")) return { platform, pageType: "SEARCH" };
      return { platform, pageType: "UNKNOWN", productId };
    }

    // 4. TikTok Shop
    if (platform === "TIKTOK_SHOP") {
      if (pathname.includes("/product/")) {
        return { platform, pageType: "DETAIL", productId, offerId: productId };
      }
      return { platform, pageType: "UNKNOWN", productId };
    }

    // 5. AliExpress
    if (platform === "ALIEXPRESS") {
      if (pathname.includes("/item/")) {
        return { platform, pageType: "DETAIL", productId, offerId: productId };
      }
      return { platform, pageType: "UNKNOWN", productId };
    }

    // 6. Etsy
    if (platform === "ETSY") {
      if (/\/listing\/\d+/i.test(pathname)) {
        return { platform, pageType: "DETAIL", productId, offerId: productId };
      }
      if (pathname.includes("/search") || pathname.includes("/market/")) return { platform, pageType: "SEARCH" };
      if (pathname.includes("/shop/")) return { platform, pageType: "SHOP" };
      return { platform, pageType: "UNKNOWN", productId };
    }

    // 7. Amazon quốc tế
    if (platform === "AMAZON") {
      if (/\/(?:dp|gp\/product|gp\/aw\/d|product)\/[A-Z0-9]{10}(?:[/?]|$)/i.test(pathname)) {
        return { platform, pageType: "DETAIL", productId, offerId: productId };
      }
      if (pathname.startsWith("/s") || parsed.searchParams.has("k")) return { platform, pageType: "SEARCH" };
      return { platform, pageType: "UNKNOWN", productId };
    }

    return { platform, pageType: "UNKNOWN", productId };
  } catch {
    return { platform, pageType: "UNKNOWN", productId };
  }
}

export function detect1688Page(url: string = window.location.href): {
  pageType: PageType;
  offerId?: string;
  shopId?: string;
} {
  const res = detectAnyCommercePage(url);
  return {
    pageType: res.pageType,
    offerId: res.productId,
    shopId: res.shopId
  };
}
