import { Raw1688SearchItem } from "@hub1688/shared-types";
import { Search1688Extractor } from "./1688-search.extractor.js";

export class Shop1688Extractor {
  /**
   * Trích xuất danh mục sản phẩm của gian hàng 1688
   */
  public static extractShopCatalog(): Raw1688SearchItem[] {
    return Search1688Extractor.extractCards();
  }
}
