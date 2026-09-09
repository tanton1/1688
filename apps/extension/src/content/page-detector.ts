export type PageType = "DETAIL" | "SEARCH" | "SHOP" | "UNKNOWN";

export function detect1688Page(url: string = window.location.href): {
  pageType: PageType;
  offerId?: string;
  shopId?: string;
} {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const hostname = parsed.hostname;
    const searchParams = parsed.searchParams;

    // 1. Kiểm tra trang Chi tiết sản phẩm (Detail page)
    // Hỗ trợ: detail.1688.com/offer/123.html, m.1688.com/offer/123, url có offerId=123
    const offerMatch = pathname.match(/\/offer\/(\d+)/) || 
                       searchParams.get("offerId") || 
                       searchParams.get("itemId") ||
                       searchParams.get("offer_id");

    if (offerMatch) {
      const offerId = typeof offerMatch === "string" ? offerMatch : offerMatch[1];
      return {
        pageType: "DETAIL",
        offerId
      };
    }

    // 2. Kiểm tra trang Kết quả tìm kiếm (Search results)
    // Ví dụ: s.1688.com, search.1688.com
    if (hostname.includes("s.1688.com") || pathname.includes("/selloffer/") || pathname.includes("/youyuan/")) {
      return { pageType: "SEARCH" };
    }

    // 3. Kiểm tra trang Gian hàng / Shop catalog
    if (pathname.includes("/page/offerlist") || pathname.includes("/page/index") || hostname.match(/shop\d+\.1688\.com/)) {
      const shopIdMatch = hostname.match(/([a-zA-Z0-9_-]+)\.1688\.com/);
      return {
        pageType: "SHOP",
        shopId: shopIdMatch ? shopIdMatch[1] : undefined
      };
    }

    return { pageType: "UNKNOWN" };
  } catch (err) {
    console.error("[1688 Hub] Lỗi phân tích URL:", err);
    return { pageType: "UNKNOWN" };
  }
}
