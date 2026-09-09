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

    // 1. Kiểm tra trang Chi tiết sản phẩm (Detail page)
    // Ví dụ: https://detail.1688.com/offer/83647282933.html
    if (hostname.includes("detail.1688.com") && pathname.includes("/offer/")) {
      const match = pathname.match(/\/offer\/(\d+)\.html/);
      return {
        pageType: "DETAIL",
        offerId: match ? match[1] : undefined
      };
    }

    // 2. Kiểm tra trang Kết quả tìm kiếm (Search results)
    // Ví dụ: https://s.1688.com/youyuan/index.htm hoặc https://s.1688.com/selloffer/offer_search.htm
    if (hostname.includes("s.1688.com")) {
      return { pageType: "SEARCH" };
    }

    // 3. Kiểm tra trang Gian hàng / Shop catalog
    // Ví dụ: https://shop123.1688.com/page/offerlist.htm
    if (pathname.includes("/page/offerlist.htm") || pathname.includes("/page/index.htm")) {
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
