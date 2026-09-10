import { Raw1688SearchItem, BulkSearchItem } from "@hub1688/shared-types";

export class Search1688Extractor {
  /**
   * Trích xuất danh sách các thẻ sản phẩm trên trang kết quả tìm kiếm hoặc danh mục gian hàng
   */
  public static extractCards(): BulkSearchItem[] {
    const items: BulkSearchItem[] = [];
    const selector = [
      ".space-common-card",
      ".sm-offer-item",
      ".search-offer-item",
      ".mo-offer-card",
      ".mo-card",
      "[data-offer-id]",
      ".common-card",
      ".mo-offer-item",
      "div[class*='offer-card']",
      "div[class*='sm-offer']"
    ].join(", ");

    const cardEls = document.querySelectorAll(selector);

    cardEls.forEach(card => {
      // 1. Tìm offerId từ attribute data-offer-id hoặc link
      let offerId = card.getAttribute("data-offer-id") || "";
      let href = "";

      const linkEl = card.querySelector("a[href*='detail.1688.com/offer/']") as HTMLAnchorElement;
      if (linkEl) {
        href = linkEl.href;
        const offerIdMatch = href.match(/\/offer\/(\d+)\.html/);
        if (offerIdMatch) {
          offerId = offerIdMatch[1];
        }
      }

      if (!offerId) return;
      if (!href) href = `https://detail.1688.com/offer/${offerId}.html`;

      // 2. Tiêu đề
      const titleEl = card.querySelector(".title, .desc, .subject, [class*='title'], [class*='desc']") as HTMLElement;
      const title = titleEl ? titleEl.innerText.trim() : `Sản phẩm 1688 #${offerId}`;

      // 3. Giá tệ CNY
      const priceEl = card.querySelector(".price, .money, .value, [class*='price'], [class*='money']") as HTMLElement;
      const priceText = priceEl ? priceEl.innerText.replace(/[¥￥\s]/g, "") : "0";
      const priceCNY = parseFloat(priceText) || 25.0;

      // 4. Ảnh đại diện
      const imgEl = card.querySelector("img") as HTMLImageElement;
      let imageUrl = imgEl ? (imgEl.src || imgEl.getAttribute("data-src") || imgEl.getAttribute("data-lazyload-src") || "") : "";
      if (imageUrl.startsWith("//")) imageUrl = "https:" + imageUrl;

      // 5. Tên Shop & Doanh số nếu có
      const shopEl = card.querySelector(".company-name, .shop-name, [class*='company'], [class*='shop']") as HTMLElement;
      const shopName = shopEl ? shopEl.innerText.trim() : "";

      const salesEl = card.querySelector(".deal-cnt, .sales-count, [class*='deal'], [class*='sale']") as HTMLElement;
      const salesCount = salesEl ? parseInt(salesEl.innerText.replace(/[^\d]/g, "")) || 0 : 0;

      items.push({
        offerId,
        title,
        priceCNY,
        imageUrl,
        shopName,
        salesCount,
        detailUrl: href
      });
    });

    return items;
  }
}

