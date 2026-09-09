import { Raw1688SearchItem } from "@hub1688/shared-types";

export class Search1688Extractor {
  /**
   * Trích xuất danh sách các thẻ sản phẩm trên trang kết quả tìm kiếm
   */
  public static extractCards(): Raw1688SearchItem[] {
    const items: Raw1688SearchItem[] = [];
    const cardEls = document.querySelectorAll(".space-common-card, .sm-offer-item, .search-offer-item");

    cardEls.forEach(card => {
      const linkEl = card.querySelector("a[href*='detail.1688.com/offer/']") as HTMLAnchorElement;
      if (!linkEl) return;

      const href = linkEl.href;
      const offerIdMatch = href.match(/\/offer\/(\d+)\.html/);
      if (!offerIdMatch) return;

      const offerId = offerIdMatch[1];
      const titleEl = card.querySelector(".title, .desc, .subject") as HTMLElement;
      const title = titleEl ? titleEl.innerText.trim() : `Sản phẩm 1688 #${offerId}`;

      const priceEl = card.querySelector(".price, .money, .value") as HTMLElement;
      const priceText = priceEl ? priceEl.innerText.replace(/[¥￥\s]/g, "") : "0";
      const priceCNY = parseFloat(priceText) || 25.0;

      const imgEl = card.querySelector("img") as HTMLImageElement;
      const thumbUrl = imgEl ? (imgEl.src || imgEl.getAttribute("data-src") || "") : "";

      items.push({
        offerId,
        title,
        priceCNY,
        thumbUrl,
        detailUrl: href
      });
    });

    return items;
  }
}
