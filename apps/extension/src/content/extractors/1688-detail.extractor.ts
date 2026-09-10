import {
  Raw1688Product,
  Raw1688Shop,
  Raw1688SkuProp,
  Raw1688SkuItem,
  Raw1688Attribute,
  Raw1688PriceTier
} from "@hub1688/shared-types";

export class Detail1688Extractor {
  /**
   * Trích xuất thông tin chi tiết của sản phẩm 1688 (Hình ảnh, Video, Thuộc tính, Biến thể, Bảng giá sỉ)
   */
  public static async extract(): Promise<Raw1688Product> {
    const offerIdMatch = window.location.pathname.match(/\/offer\/(\d+)\.html/);
    const offerId = offerIdMatch ? offerIdMatch[1] : `1688_${Date.now()}`;

    // 1. Tiêu đề sản phẩm
    const titleEl = document.querySelector(".title-text, .d-title, h1, .title") as HTMLElement;
    const title = titleEl ? titleEl.innerText.trim() : document.title.replace(/- 1688.*/, "").trim();

    // 2. Thông tin Shop / Nhà cung cấp
    const shopNameEl = document.querySelector(".company-name, .shop-name, .supplier-name, .shop-head-info a") as HTMLElement;
    const shopName = shopNameEl ? shopNameEl.innerText.trim() : "Nhà cung cấp 1688";
    const shopUrl = window.location.origin;

    const shop: Raw1688Shop = {
      shopId: `shop_${offerId}`,
      shopName,
      shopUrl,
      ratingScore: 4.8
    };

    // 3. Khoảng giá (Price range) & Bảng giá sỉ bậc thang (Price Tiers)
    let minPriceCNY = 32.0;
    let maxPriceCNY = 45.0;
    const priceTiers: Raw1688PriceTier[] = [];

    const priceEls = document.querySelectorAll(".price-text, .price-num, .price, .normal-price");
    if (priceEls.length > 0) {
      const pricesFound: number[] = [];
      priceEls.forEach(el => {
        const text = (el as HTMLElement).innerText.replace(/[¥￥\s]/g, "");
        const val = parseFloat(text);
        if (!isNaN(val) && val > 0) pricesFound.push(val);
      });
      if (pricesFound.length > 0) {
        minPriceCNY = Math.min(...pricesFound);
        maxPriceCNY = Math.max(...pricesFound);
      }
    }

    // Quét bảng giá sỉ bậc thang
    const ladderEls = document.querySelectorAll(".price-ladder .ladder-item, .step-price .price-item, .od-price-tier, .price-range-item");
    ladderEls.forEach(el => {
      const qtyEl = el.querySelector(".ladder-num, .count, .quantity, .unit");
      const priceEl = el.querySelector(".ladder-price, .price, .value, .num");
      if (qtyEl && priceEl) {
        const minQty = parseInt(qtyEl.textContent?.replace(/[^0-9]/g, "") || "0", 10);
        const priceVal = parseFloat(priceEl.textContent?.replace(/[¥￥\s]/g, "") || "0");
        if (minQty > 0 && priceVal > 0) {
          priceTiers.push({ minQuantity: minQty, price: priceVal });
        }
      }
    });

    // 4. Bóc tách ma trận SKU, ảnh gallery & ảnh mô tả từ JSON Scripts trước (chuẩn xác nhất)
    const {
      skuProps,
      skuMap,
      priceTiers: scriptTiers,
      minPrice: scriptMin,
      maxPrice: scriptMax,
      scriptImages,
      scriptDescUrl,
      scriptDetailImages
    } = await this.extractSkuMatrix(offerId, minPriceCNY);

    if (scriptTiers && scriptTiers.length > 0 && priceTiers.length === 0) {
      priceTiers.push(...scriptTiers);
    }
    if (scriptMin && scriptMin > 0) minPriceCNY = scriptMin;
    if (scriptMax && scriptMax > 0) maxPriceCNY = scriptMax;

    // 5. Danh sách hình ảnh sản phẩm (Gallery images)
    const images: string[] = [];

    // 5a. Ưu tiên ảnh từ Script JSON gốc 1688 (chuẩn 100%, không bị nén thumbnail)
    if (scriptImages && scriptImages.length > 0) {
      scriptImages.forEach(src => {
        let clean = src.trim();
        if (clean.startsWith("//")) clean = "https:" + clean;
        clean = clean.replace(/_\d+x\d+.*$/, "").replace(/\.\d+x\d+\./g, ".800x800.");
        if (!images.includes(clean)) images.push(clean);
      });
    }

    // 5b. Quét các selector gallery hiện đại trên DOM
    const gallerySelectors = [
      ".detail-gallery-turn img",
      ".fui-slider img",
      ".vertical-img img",
      ".main-img img",
      ".od-gallery img",
      ".tab-trigger img",
      ".detail-gallery img",
      ".lib-image img",
      "[class*='gallery-image'] img",
      "[class*='gallery'] img",
      "[class*='preview'] img",
      "[class*='thumb'] img",
      "[class*='slider'] img",
      ".app-gallery img"
    ];
    const imgEls = document.querySelectorAll(gallerySelectors.join(", "));
    imgEls.forEach(img => {
      let src = (img as HTMLImageElement).src ||
                (img as HTMLImageElement).getAttribute("data-src") ||
                (img as HTMLImageElement).getAttribute("data-lazyload-src");
      if (src && !src.includes("dummy") && !src.includes("spacer") && !src.includes("icon") && !src.includes("data:image")) {
        src = src.replace(/_\d+x\d+.*$/, "").replace(/\.\d+x\d+\./g, ".800x800.");
        if (src.startsWith("//")) src = "https:" + src;
        if (!images.includes(src)) images.push(src);
      }
    });

    // 5c. Bổ sung ảnh mẫu biến thể (Sample images) vào gallery nếu gallery ít ảnh
    if (skuProps && skuProps.length > 0) {
      for (const prop of skuProps) {
        for (const val of prop.values) {
          if (val.imageUrl && !images.includes(val.imageUrl)) {
            images.push(val.imageUrl);
          }
          if (images.length >= 10) break;
        }
        if (images.length >= 10) break;
      }
    }

    if (images.length === 0) {
      images.push("https://cbu01.alicdn.com/img/ibank/dummy_1688.jpg");
    }

    // 6. Bóc tách Video 1688 (nếu có)
    let videoUrl: string | null = null;
    let videoPosterUrl: string | null = null;

    const videoEl = document.querySelector("video") as HTMLVideoElement | null;
    if (videoEl) {
      videoUrl = videoEl.src || videoEl.querySelector("source")?.src || null;
      videoPosterUrl = videoEl.poster || null;
    }

    if (!videoUrl) {
      const videoContainer = document.querySelector("[data-video-url], [data-mp4], .lib-video, .video-box");
      if (videoContainer) {
        videoUrl = videoContainer.getAttribute("data-video-url") || videoContainer.getAttribute("data-mp4") || null;
      }
    }

    if (!videoUrl) {
      const scripts = document.querySelectorAll("script:not([src])");
      for (const s of scripts) {
        const content = s.textContent || "";
        const match = content.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/i) ||
                      content.match(/https?:\/\/cloud\.video\.taobao\.com\/play\/u\/[^"'\s]+/i);
        if (match) {
          videoUrl = match[0].replace(/\\u002F/g, "/").replace(/\\\//g, "/");
          break;
        }
      }
    }

    // 7. Ảnh mô tả dài (Detail Description Images - Bảng size, specs, infographic)
    const descriptionImages: string[] = [];

    // 7a. Lấy từ script nếu đã có
    if (scriptDetailImages && scriptDetailImages.length > 0) {
      scriptDetailImages.forEach(img => {
        if (!descriptionImages.includes(img)) descriptionImages.push(img);
      });
    }

    // 7b. Thử fetch nội dung từ TFS URL hoặc descUrl nếu có
    const descUrl = (document.querySelector("#desc-lazyload-container, [data-tfs-url], [data-desc-url]") as HTMLElement)?.getAttribute("data-tfs-url") ||
                    (document.querySelector("#desc-lazyload-container, [data-tfs-url], [data-desc-url]") as HTMLElement)?.getAttribute("data-url") ||
                    scriptDescUrl;

    if (descUrl) {
      try {
        const fullDescUrl = descUrl.startsWith("//") ? "https:" + descUrl : descUrl;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(fullDescUrl, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const descText = await res.text();
          const imgMatches = descText.match(/(?:https?:)?\/\/[^"'\s]+\.(?:jpg|png|jpeg|webp)(?:_[^"'\s]*)?/gi);
          if (imgMatches) {
            imgMatches.forEach(img => {
              let clean = img.trim();
              if (clean.startsWith("//")) clean = "https:" + clean;
              clean = clean.replace(/_\d+x\d+.*$/, "");
              if (!clean.includes("dummy") && !clean.includes("spacer") && !clean.includes("icon") && !descriptionImages.includes(clean)) {
                descriptionImages.push(clean);
              }
            });
          }
        }
      } catch {}
    }

    // 7c. Quét mọi container ảnh mô tả trong DOM
    const descSelectors = [
      "#desc-lazyload-container img",
      ".content-detail img",
      ".desc-item img",
      ".detail-desc img",
      ".mod-detail-description img",
      "#de-description-detail img",
      "[class*='detail-desc'] img",
      "[class*='desc-item'] img",
      "[class*='description'] img",
      "[class*='desc-lazyload'] img"
    ];
    const descImgEls = document.querySelectorAll(descSelectors.join(", "));
    descImgEls.forEach(img => {
      let src = (img as HTMLImageElement).getAttribute("data-lazyload-src") ||
                (img as HTMLImageElement).getAttribute("data-src") ||
                (img as HTMLImageElement).getAttribute("data-original") ||
                (img as HTMLImageElement).src;
      if (src && !src.includes("dummy") && !src.includes("spacer") && !src.includes("icon") && !src.includes("data:image")) {
        if (src.startsWith("//")) src = "https:" + src;
        src = src.replace(/_\d+x\d+.*$/, "");
        if (!descriptionImages.includes(src)) descriptionImages.push(src);
      }
    });

    // 8. Thuộc tính sản phẩm (Attributes)
    const attributes: Raw1688Attribute[] = [];
    const attrRows = document.querySelectorAll(".obj-sku .prop-item, .offer-attr-item, .de-desc-item");
    attrRows.forEach(row => {
      const text = (row as HTMLElement).innerText;
      const parts = text.split(/[:：]/);
      if (parts.length >= 2) {
        attributes.push({
          nameCN: parts[0].trim(),
          valueCN: parts[1].trim()
        });
      }
    });

    return {
      offerId,
      sourceUrl: window.location.href,
      title,
      shop,
      moq: 2,
      prices: {
        minPriceCNY,
        maxPriceCNY,
        currency: "CNY",
        priceTiers: priceTiers.length > 0 ? priceTiers : undefined
      },
      images,
      videoUrl,
      descriptionImages,
      attributes,
      skuProps,
      skuMap,
      extractedAt: new Date().toISOString()
    };
  }

  /**
   * Bộ điều phối bóc tách SKU đa tầng:
   * Tầng 1: Trích xuất Script JSON gốc (1688 __INIT_DATA / skuModel) - chuẩn xác 100%
   * Tầng 2: Trích xuất Bảng đặt hàng sỉ (Wholesale Order Table) - tối ưu cho bộ sản phẩm, combo
   * Tầng 3: Trích xuất Các nhóm thuộc tính DOM (Property Groups) - linh hoạt với var custom dạng text & ảnh
   */
  private static async extractSkuMatrix(offerId: string, fallbackPrice: number): Promise<{
    skuProps: Raw1688SkuProp[];
    skuMap: Record<string, Raw1688SkuItem>;
    priceTiers?: Raw1688PriceTier[];
    minPrice?: number;
    maxPrice?: number;
    scriptImages?: string[];
    scriptDescUrl?: string;
    scriptDetailImages?: string[];
  }> {
    // 1. Thử Tầng 1: Script JSON
    try {
      const fromJson = this.extractFromJsonScripts(offerId);
      if (fromJson && fromJson.skuProps.length > 0) {
        console.log(`[1688 Extractor] Trích xuất thành công từ Script JSON: ${fromJson.skuProps.length} thuộc tính, ${Object.keys(fromJson.skuMap).length} SKU`);
        return fromJson;
      }
    } catch (err) {
      console.warn("[1688 Extractor] Lỗi parse script JSON:", err);
    }

    // 2. Thử Tầng 2: Bảng đặt hàng sỉ (Order Table)
    try {
      const fromTable = this.extractFromWholesaleTable(offerId, fallbackPrice);
      if (fromTable && fromTable.skuProps.length > 0 && fromTable.skuProps[0].values.length > 0) {
        console.log(`[1688 Extractor] Trích xuất thành công từ Bảng đặt hàng sỉ: ${fromTable.skuProps[0].values.length} biến thể`);
        return fromTable;
      }
    } catch (err) {
      console.warn("[1688 Extractor] Lỗi quét bảng sỉ:", err);
    }

    // 3. Thử Tầng 3: Khối thuộc tính DOM (DOM Property Groups)
    try {
      const fromDom = this.extractFromDomPropertyGroups(offerId, fallbackPrice);
      if (fromDom && fromDom.skuProps.length > 0) {
        console.log(`[1688 Extractor] Trích xuất thành công từ Khối thuộc tính DOM: ${fromDom.skuProps.length} nhóm thuộc tính`);
        return fromDom;
      }
    } catch (err) {
      console.warn("[1688 Extractor] Lỗi quét khối thuộc tính DOM:", err);
    }

    // 4. Fallback an toàn: Sản phẩm đơn
    return {
      skuProps: [],
      skuMap: {
        default: {
          skuId: `sku_${offerId}_default`,
          priceCNY: fallbackPrice,
          stock: 100,
          attributes: { "Phân loại": "Tiêu chuẩn" }
        }
      }
    };
  }

  /**
   * Bộ phân tích JSON lồng nhau theo cặp ngoặc nhọn cân bằng (Balanced Braces Parser),
   * miễn nhiễm hoàn toàn với lỗi cắt chuỗi của Regex khi chuỗi JSON 1688 quá dài (>100KB)
   */
  private static extractBalancedJsonObject(str: string, startIndex: number): string | null {
    let depth = 0;
    let inString = false;
    let escape = false;
    let start = -1;

    for (let i = startIndex; i < str.length; i++) {
      const ch = str[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (ch === "{") {
          if (depth === 0) start = i;
          depth++;
        } else if (ch === "}") {
          depth--;
          if (depth === 0 && start !== -1) {
            return str.slice(start, i + 1);
          }
        }
      }
    }
    return null;
  }

  /**
   * Tầng 1: Trích xuất trực tiếp từ các thẻ <script> chứa dữ liệu cấu hình 1688
   */
  private static extractFromJsonScripts(offerId: string): {
    skuProps: Raw1688SkuProp[];
    skuMap: Record<string, Raw1688SkuItem>;
    priceTiers?: Raw1688PriceTier[];
    minPrice?: number;
    maxPrice?: number;
    scriptImages?: string[];
    scriptDescUrl?: string;
    scriptDetailImages?: string[];
  } | null {
    const scripts = document.querySelectorAll("script:not([src])");
    for (const s of scripts) {
      const text = s.textContent || "";
      if (!text.includes("skuModel") && !text.includes("skuProps") && !text.includes("__INIT_DATA") && !text.includes("iDetailConfig") && !text.includes("wingxViewData")) {
        continue;
      }

      try {
        let rawData: any = null;

        // Quét các vị trí khởi tạo JSON phổ biến trên 1688
        const markers = ["window.__INIT_DATA", "wingxViewData", "iDetailConfig", '"skuModel"'];
        for (const marker of markers) {
          const mIdx = text.indexOf(marker);
          if (mIdx !== -1) {
            const braceIdx = text.indexOf("{", mIdx);
            if (braceIdx !== -1) {
              const jsonStr = this.extractBalancedJsonObject(text, braceIdx);
              if (jsonStr) {
                try {
                  const parsed = JSON.parse(jsonStr);
                  if (marker === '"skuModel"') {
                    rawData = { globalData: { skuModel: parsed } };
                  } else {
                    rawData = parsed;
                  }
                  if (rawData) break;
                } catch {}
              }
            }
          }
        }

        if (!rawData) continue;

        // Trích xuất hình ảnh Gallery từ script gốc (chất lượng cao nhất của Alibaba)
        const scriptImages: string[] = [];
        const rawImageList = rawData?.data?.offerImgList ||
                             rawData?.globalData?.images ||
                             rawData?.data?.images ||
                             rawData?.data?.offerDetail?.image?.images ||
                             rawData?.data?.image?.images;
        if (Array.isArray(rawImageList)) {
          rawImageList.forEach((img: any) => {
            let src = typeof img === "string" ? img : img?.url || img?.src;
            if (src && typeof src === "string") {
              if (src.startsWith("//")) src = "https:" + src;
              src = src.replace(/_\d+x\d+.*$/, "").replace(/\.\d+x\d+\./g, ".800x800.");
              if (!scriptImages.includes(src)) scriptImages.push(src);
            }
          });
        }

        // Trích xuất URL mô tả chi tiết từ TFS (Alibaba Taobao File System)
        const scriptDescUrl = rawData?.data?.descriptionUrl ||
                              rawData?.globalData?.descUrl ||
                              rawData?.data?.offerDetail?.descUrl ||
                              rawData?.iDetailConfig?.descUrl ||
                              rawData?.data?.descUrl;

        // Định vị skuModel trong object tree
        const skuModel = rawData?.globalData?.skuModel ||
                         rawData?.data?.data?.skuModel ||
                         rawData?.data?.skuModel ||
                         rawData?.skuModel ||
                         rawData?.commodity?.skuModel ||
                         rawData?.data?.offerDetail?.skuModel ||
                         rawData?.sku;

        if (!skuModel) {
          if (scriptImages.length > 0) {
            return {
              skuProps: [],
              skuMap: {},
              scriptImages,
              scriptDescUrl
            };
          }
          continue;
        }

        const rawSkuProps = skuModel.skuProps || skuModel.props || [];
        const rawSkuInfoMap = skuModel.skuInfoMap || skuModel.skuMap || {};

        if (!Array.isArray(rawSkuProps) || rawSkuProps.length === 0) continue;

        const skuProps: Raw1688SkuProp[] = [];
        for (let pIdx = 0; pIdx < rawSkuProps.length; pIdx++) {
          const p = rawSkuProps[pIdx];
          const propName = (p.prop || p.propName || p.name || `Phân loại ${pIdx + 1}`).trim();
          const rawValues = p.value || p.values || [];
          const values: Array<{ valueId: string; valueCN: string; imageUrl?: string }> = [];

          for (let vIdx = 0; vIdx < rawValues.length; vIdx++) {
            const v = rawValues[vIdx];
            const valName = (v.name || v.value || v.propValue || `Tùy chọn ${vIdx + 1}`).trim();
            let img = v.imageUrl || v.imgUrl || v.image || v.picUrl || v.thumbnail || v.propValueImgUrl || v.skuImageUrl || v.previewImgUrl;
            if (img && typeof img === "string") {
              img = img.replace(/_\d+x\d+.*$/, "").replace(/\.\d+x\d+\./g, ".800x800.");
              if (img.startsWith("//")) img = "https:" + img;
            }
            values.push({
              valueId: v.vaid ? String(v.vaid) : `p${pIdx}_v${vIdx}`,
              valueCN: valName,
              imageUrl: img
            });
          }

          if (values.length > 0) {
            skuProps.push({
              propId: p.fid ? `prop_${p.fid}` : `prop_${pIdx}`,
              propNameCN: propName,
              values
            });
          }
        }

        if (skuProps.length === 0) continue;

        // Bóc tách skuMap từ skuInfoMap
        const skuMap: Record<string, Raw1688SkuItem> = {};
        const foundPrices: number[] = [];

        for (const [key, item] of Object.entries(rawSkuInfoMap) as [string, any][]) {
          if (!item) continue;
          const price = parseFloat(item.price || item.discountPrice || item.retailPrice || "0");
          const stock = parseInt(item.canBookCount || item.amountOnSale || item.quantity || "100", 10);
          const skuId = item.skuId ? String(item.skuId) : (item.specId || `sku_${offerId}_${key}`);
          if (price > 0) foundPrices.push(price);

          let img = item.imageUrl || item.imgUrl;
          if (img && typeof img === "string") {
            img = img.replace(/\.32x32\./g, ".800x800.").replace(/\.60x60\./g, ".800x800.");
            if (img.startsWith("//")) img = "https:" + img;
          }

          const skuItem: Raw1688SkuItem = {
            skuId,
            specId: item.specId,
            priceCNY: price > 0 ? price : 30,
            stock: stock > 0 ? stock : 100,
            attributes: {},
            imageUrl: img
          };

          if (key.includes("&")) {
            const parts = key.split("&");
            if (skuProps[0]) skuItem.attributes[skuProps[0].propNameCN] = parts[0];
            if (skuProps[1]) skuItem.attributes[skuProps[1].propNameCN] = parts[1];
          } else {
            if (skuProps[0]) skuItem.attributes[skuProps[0].propNameCN] = key;
          }

          skuMap[key] = skuItem;
          if (item.specId) skuMap[item.specId] = skuItem;
          if (item.skuId) skuMap[String(item.skuId)] = skuItem;
        }

        // Bóc tách Bảng giá sỉ bậc thang từ orderParamModel
        const priceTiers: Raw1688PriceTier[] = [];
        const orderParam = rawData?.globalData?.orderParamModel?.orderParam ||
                           rawData?.data?.data?.orderParamModel?.orderParam ||
                           rawData?.orderParamModel?.orderParam;
        if (orderParam?.skuParam?.skuRangePrices) {
          for (const rp of orderParam.skuParam.skuRangePrices) {
            const begin = parseInt(rp.beginAmount || "0", 10);
            const p = parseFloat(rp.price || "0");
            if (begin > 0 && p > 0) {
              priceTiers.push({ minQuantity: begin, price: p });
              foundPrices.push(p);
            }
          }
        }

        return {
          skuProps,
          skuMap,
          priceTiers: priceTiers.length > 0 ? priceTiers : undefined,
          minPrice: foundPrices.length > 0 ? Math.min(...foundPrices) : undefined,
          maxPrice: foundPrices.length > 0 ? Math.max(...foundPrices) : undefined
        };
      } catch {}
    }

    return null;
  }

  /**
   * Tầng 2: Trích xuất từ Bảng Đặt Hàng Sỉ (Wholesale Order Table)
   * Rất phổ biến cho Bộ sản phẩm (套装, 多件套, combo, quy cách)
   */
  private static extractFromWholesaleTable(offerId: string, fallbackPrice: number): {
    skuProps: Raw1688SkuProp[];
    skuMap: Record<string, Raw1688SkuItem>;
  } | null {
    const tableContainers = document.querySelectorAll(
      ".od-pc-attribute, .order-table, .table-sku, .sku-list, .unit-detail-spec-operator, .mod-detail-version2018-order, .pc-sku-wrapper, table[class*='sku'], [class*='orderTable']"
    );
    if (tableContainers.length === 0) return null;

    for (const container of tableContainers) {
      const rows = container.querySelectorAll(
        "tr, .order-table-item, .table-item, .sku-item-line, .sku-row, .list-item, [class*='orderItem'], [class*='skuRow'], .unit-detail-spec-operator"
      );
      if (rows.length === 0) continue;

      const values: Array<{ valueId: string; valueCN: string; imageUrl?: string }> = [];
      const skuMap: Record<string, Raw1688SkuItem> = {};

      rows.forEach((row, idx) => {
        if (row.querySelector("th") || row.classList.contains("header") || row.classList.contains("th")) return;

        const nameEl = row.querySelector(".name, .spec-name, .sku-name, .title, td:first-child, [class*='specName'], [class*='skuTitle']") as HTMLElement;
        if (!nameEl) return;
        const name = nameEl.innerText.trim();
        if (!name || name.length < 1 || name === "规格" || name === "尺码" || name === "数量" || name === "单价") return;

        const priceEl = row.querySelector(".price, .spec-price, .order-price, .price-text, .money, [class*='price']") as HTMLElement;
        const priceVal = priceEl ? parseFloat(priceEl.innerText.replace(/[¥￥\s]/g, "")) : fallbackPrice;
        const finalPrice = (!isNaN(priceVal) && priceVal > 0) ? priceVal : fallbackPrice;

        const stockEl = row.querySelector(".amount, .stock, .inventory, .can-book-count, .count, input.amount-input, [class*='count'], [class*='stock']") as HTMLElement;
        let stockVal = 150;
        if (stockEl) {
          if (stockEl instanceof HTMLInputElement && stockEl.getAttribute("max")) {
            stockVal = parseInt(stockEl.getAttribute("max") || "150", 10);
          } else {
            const s = parseInt(stockEl.innerText?.replace(/[^0-9]/g, "") || "150", 10);
            if (s > 0) stockVal = s;
          }
        }

        const imgEl = row.querySelector("img") as HTMLImageElement;
        let img = imgEl ? (imgEl.src || imgEl.getAttribute("data-src") || imgEl.getAttribute("data-lazyload-src")) : undefined;
        if (!img) {
          const styleEl = row.querySelector("[style*='background-image']") as HTMLElement;
          if (styleEl) {
            const bgMatch = styleEl.getAttribute("style")?.match(/url\(['"]?(.*?)['"]?\)/i);
            if (bgMatch) img = bgMatch[1];
          }
        }
        if (img) {
          img = img.replace(/_\d+x\d+.*$/, "").replace(/\.\d+x\d+\./g, ".800x800.");
          if (img.startsWith("//")) img = "https:" + img;
        }

        const skuId = row.getAttribute("data-sku-id") || row.getAttribute("data-spec-id") || `table_sku_${offerId}_${idx}`;
        const valueId = `spec_${idx}`;

        values.push({
          valueId,
          valueCN: name,
          imageUrl: img
        });

        skuMap[name] = {
          skuId,
          priceCNY: finalPrice,
          stock: stockVal,
          attributes: { "规格": name },
          imageUrl: img
        };
        skuMap[valueId] = skuMap[name];
      });

      if (values.length > 0) {
        return {
          skuProps: [
            {
              propId: "prop_specification",
              propNameCN: "规格 (Quy cách)",
              values
            }
          ],
          skuMap
        };
      }
    }

    return null;
  }

  /**
   * Tầng 3: Trích xuất linh hoạt từ các Khối thuộc tính DOM (DOM Property Groups)
   * Quét cả nút ảnh và nút chữ, bảo tồn chính xác tên thuộc tính tùy chỉnh (var custom)
   */
  private static extractFromDomPropertyGroups(offerId: string, fallbackPrice: number): {
    skuProps: Raw1688SkuProp[];
    skuMap: Record<string, Raw1688SkuItem>;
  } {
    const skuProps: Raw1688SkuProp[] = [];
    const skuMap: Record<string, Raw1688SkuItem> = {};

    // Tìm các container nhóm thuộc tính
    const groupEls = document.querySelectorAll(
      ".prop-item, .prop-line, .sku-prop, .obj-sku, .sku-filter-item, [class*='propGroup'], [class*='skuItemWrapper'], [class*='prop-item'], .od-pc-offer-prop"
    );

    groupEls.forEach((group, gIdx) => {
      // 1. Tên nhóm thuộc tính (Var Custom Title)
      const titleEl = group.querySelector(".prop-title, .prop-name, .title, .sku-title, .label, [class*='propTitle'], [class*='skuTitle']") as HTMLElement;
      let propName = titleEl ? titleEl.innerText.replace(/[:：\s]/g, "").trim() : "";
      if (!propName || propName.length === 0) {
        propName = gIdx === 0 ? "颜色 (Màu sắc)" : "规格 (Quy cách)";
      }

      // 2. Quét các giá trị (cả nút ảnh lẫn nút chữ)
      const valueEls = group.querySelectorAll(
        ".prop-img-item, .sku-prop-item, .prop-text-item, .sku-text-item, .sku-item, button.sku-tag, .sku-tag-item, li.text-item, span.sku-tag, [class*='skuTag'], [class*='propImgItem'], [class*='skuItem'], [class*='prop-item']"
      );

      const values: Array<{ valueId: string; valueCN: string; imageUrl?: string }> = [];

      valueEls.forEach((valEl, vIdx) => {
        const el = valEl as HTMLElement;
        const name = el.getAttribute("title") ||
                     el.getAttribute("data-value") ||
                     el.getAttribute("data-name") ||
                     el.innerText.trim();

        if (!name || name.length === 0) return;
        if (values.some(v => v.valueCN === name)) return; // Tránh trùng lặp

        const imgEl = el.querySelector("img") as HTMLImageElement;
        let img = imgEl ? (imgEl.src || imgEl.getAttribute("data-src") || imgEl.getAttribute("data-lazyload-src")) : undefined;
        if (!img) {
          const style = el.getAttribute("style") || "";
          const bgMatch = style.match(/url\(['"]?(.*?)['"]?\)/i);
          if (bgMatch) img = bgMatch[1];
        }
        if (!img) {
          img = el.getAttribute("data-imgs") || el.getAttribute("data-image") || undefined;
        }
        if (img) {
          img = img.replace(/_\d+x\d+.*$/, "").replace(/\.\d+x\d+\./g, ".800x800.");
          if (img.startsWith("//")) img = "https:" + img;
        }

        values.push({
          valueId: `p${gIdx}_v${vIdx}`,
          valueCN: name,
          imageUrl: img
        });
      });

      if (values.length > 0) {
        skuProps.push({
          propId: `prop_${gIdx}`,
          propNameCN: propName,
          values
        });
      }
    });

    // Nếu không tìm thấy nhóm nhưng có các nút ảnh độc lập
    if (skuProps.length === 0) {
      const standaloneImgs = document.querySelectorAll(".prop-img-item, .sku-prop-item, [class*='propImgItem']");
      if (standaloneImgs.length > 0) {
        const values: Array<{ valueId: string; valueCN: string; imageUrl?: string }> = [];
        standaloneImgs.forEach((item, idx) => {
          const name = (item as HTMLElement).getAttribute("title") || (item as HTMLElement).innerText.trim() || `Phân loại ${idx + 1}`;
          const img = item.querySelector("img")?.src;
          values.push({
            valueId: `col_${idx}`,
            valueCN: name,
            imageUrl: img
          });
        });
        skuProps.push({
          propId: "prop_0",
          propNameCN: "Phân loại",
          values
        });
      }
    }

    // Xây dựng skuMap từ các thuộc tính tìm thấy
    if (skuProps.length === 1) {
      // 1 thuộc tính: ánh xạ trực tiếp từng biến thể
      skuProps[0].values.forEach((v, idx) => {
        const skuId = `1688_${offerId}_${idx}`;
        skuMap[v.valueCN] = {
          skuId,
          attributes: { [skuProps[0].propNameCN]: v.valueCN },
          priceCNY: fallbackPrice,
          stock: 120,
          imageUrl: v.imageUrl
        };
        skuMap[v.valueId] = skuMap[v.valueCN];
      });
    } else if (skuProps.length >= 2) {
      // 2 thuộc tính: ánh xạ tổ hợp
      skuProps[0].values.forEach((v1, idx1) => {
        skuProps[1].values.forEach((v2, idx2) => {
          const skuId = `1688_${offerId}_${idx1}_${idx2}`;
          const key = `${v1.valueCN}&${v2.valueCN}`;
          skuMap[key] = {
            skuId,
            attributes: {
              [skuProps[0].propNameCN]: v1.valueCN,
              [skuProps[1].propNameCN]: v2.valueCN
            },
            priceCNY: fallbackPrice,
            stock: 120,
            imageUrl: v1.imageUrl
          };
          skuMap[`${v1.valueId}_${v2.valueId}`] = skuMap[key];
        });
      });
    }

    return { skuProps, skuMap };
  }
}
