import { useState, useEffect, useRef } from "react";
import { Raw1688Product } from "@hub1688/shared-types";
import { apiFetch } from "../../shared/config.js";

/**
 * Hàm tìm kiếm Tab Web đang hoạt động trên trình duyệt Chrome (hỗ trợ đa cửa sổ & Side Panel)
 */
async function findActiveWebTab(): Promise<chrome.tabs.Tab | null> {
  if (typeof chrome === "undefined" || !chrome.tabs) return null;

  try {
    // 1. Kiểm tra tab active trong cửa sổ hiện tại
    const currentTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (currentTabs[0]?.id && currentTabs[0]?.url && /^https?:\/\//.test(currentTabs[0].url)) {
      return currentTabs[0];
    }

    // 2. Kiểm tra tab active trong cửa sổ vừa focus gần nhất
    const lastFocused = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (lastFocused[0]?.id && lastFocused[0]?.url && /^https?:\/\//.test(lastFocused[0].url)) {
      return lastFocused[0];
    }

    // 3. Quét tất cả active tab trên toàn bộ các cửa sổ trình duyệt
    const allActive = await chrome.tabs.query({ active: true });
    const webActive = allActive.find(t => t.id && t.url && /^https?:\/\//.test(t.url));
    if (webActive) return webActive;

    // 4. Fallback: tìm tab web bất kỳ đang mở
    const allTabs = await chrome.tabs.query({});
    const anyWeb = allTabs.find(t => t.id && t.url && /^https?:\/\//.test(t.url));
    return anyWeb || null;
  } catch (e) {
    console.warn("[Sidepanel] Error querying active tabs:", e);
    return null;
  }
}

/**
 * Hàm thực thi trực tiếp trên DOM của Tab để trích xuất thông số tức thời (Shopify .js, Schema.org, OpenGraph, DOM Tags)
 */
async function extractCommerceProductFromDom(): Promise<any> {
  try {
    const doc = document;
    const url = window.location.href;
    const pathname = window.location.pathname;

    // 1. Thử gọi API JSON của chính Shopify store ngay trên Tab (same-origin, cực sạch và chính xác 100%)
    if (pathname.includes("/products/")) {
      try {
        const cleanPath = pathname.split("?")[0].replace(/\/$/, "");
        const res = await fetch(`${cleanPath}.js`);
        if (res.ok) {
          const shopifyData = await res.json();
          if (shopifyData && (shopifyData.title || (Array.isArray(shopifyData.variants) && shopifyData.variants.length > 0))) {
            const cleanImages: string[] = (shopifyData.images || []).map((img: any) => {
              let s = typeof img === "string" ? img : img?.src || "";
              if (s.startsWith("//")) s = "https:" + s;
              return s;
            }).filter(Boolean);

            const normalizePrice = (p: number) => {
              if (typeof p !== "number" || isNaN(p)) return 22.95;
              return p >= 100 ? Math.round((p / 100) * 100) / 100 : p;
            };

            const rawVariants = shopifyData.variants || [];
            const prices = rawVariants.map((v: any) => normalizePrice(v.price));
            const priceMin = prices.length > 0 ? Math.min(...prices) : normalizePrice(shopifyData.price);
            const priceMax = prices.length > 0 ? Math.max(...prices) : priceMin;

            return {
              url,
              title: shopifyData.title,
              images: cleanImages.length > 0 ? cleanImages : [shopifyData.featured_image].filter(Boolean),
              price: priceMin,
              priceMin,
              priceMax,
              currency: "USD",
              shopName: shopifyData.vendor || window.location.hostname,
              description: shopifyData.description || "",
              options: shopifyData.options,
              variants: rawVariants
            };
          }
        }
      } catch (e) {
        // Fallback sang DOM bóc tách
      }
    }

    // 2. Trích xuất mảng variants từ <script type="application/json"> trong DOM
    let domVariants: any[] = [];
    try {
      const jsonScripts = doc.querySelectorAll('script[type="application/json"]');
      for (const s of jsonScripts) {
        try {
          const parsed = JSON.parse(s.textContent || "");
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && (parsed[0].title || parsed[0].price !== undefined)) {
            domVariants = parsed;
            break;
          }
        } catch {}
      }
    } catch {}

    // 3. Trích xuất JSON-LD Schema.org Product
    let schemaProduct: any = null;
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      try {
        const parsed = JSON.parse(s.textContent || "{}");
        const item = Array.isArray(parsed)
          ? parsed.find((x: any) => x["@type"] === "Product")
          : (parsed["@type"] === "Product" ? parsed : null);
        if (item) {
          schemaProduct = item;
          break;
        }
      } catch {}
    }

    // 4. OpenGraph Meta Tags
    const ogTitle = doc.querySelector('meta[property="og:title"], meta[name="twitter:title"]')?.getAttribute("content")?.trim();
    const ogImage = doc.querySelector('meta[property="og:image:secure_url"], meta[property="og:image"], meta[name="twitter:image"]')?.getAttribute("content")?.trim();
    const ogPrice = doc.querySelector('meta[property="og:price:amount"], meta[property="product:price:amount"]')?.getAttribute("content")?.trim();
    const ogCurrency = doc.querySelector('meta[property="og:price:currency"], meta[property="product:price:currency"]')?.getAttribute("content")?.trim();
    const ogSiteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute("content")?.trim();
    const ogDesc = doc.querySelector('meta[property="og:description"], meta[name="description"]')?.getAttribute("content")?.trim();

    // 5. Tiêu đề
    const title = schemaProduct?.name || ogTitle || doc.querySelector("h1")?.innerText?.trim() || doc.title?.split(/[-|_|–]/)[0]?.trim();

    // 6. Hình ảnh có bộ lọc rác nghiêm ngặt
    const images: string[] = [];
    const JUNK_IMG_REGEX = /(?:icon|logo|badge|banner|trust|payment|flag|avatar|review|rating|star|arrow|svg|rec_|recommend|related|cart|checkout|halloween_badge|search-|img-menu|default-img|footer|header|menu|\/assets\/)/i;

    const addImg = (src: string | null | undefined) => {
      if (!src) return;
      let clean = src.trim();
      if (clean.startsWith("//")) clean = "https:" + clean;
      if ((clean.startsWith("http://") || clean.startsWith("https://")) && !JUNK_IMG_REGEX.test(clean)) {
        clean = clean.replace(/_\d+x\d+.*$/, "").replace(/\.32x32\..*$/, ".800x800.");
        if (!images.includes(clean)) images.push(clean);
      }
    };

    // Ưu tiên ảnh từ variants
    if (domVariants.length > 0) {
      domVariants.forEach(v => {
        let img = v.featured_image?.src || (typeof v.featured_image === "string" ? v.featured_image : null);
        if (img) addImg(img);
      });
    }

    if (schemaProduct?.image) {
      if (Array.isArray(schemaProduct.image)) schemaProduct.image.forEach(addImg);
      else addImg(schemaProduct.image);
    }
    addImg(ogImage);

    // Chỉ quét ảnh trong khối gallery sản phẩm (loại bỏ vùng recommendations, footer, header)
    doc.querySelectorAll(".product__media img, .product-single__photo img, .product-gallery img, .pdp-image-gallery img, [data-media-id] img").forEach((el: any) => {
      if (el.closest?.(".recommendations, .related-products, .product-recommendations, footer, header, nav, .cart")) return;
      addImg(el.getAttribute("data-src") || el.getAttribute("zoom-src") || el.src);
    });

    // 7. Giá & Tiền tệ
    let price = 0;
    let currency = "USD";
    if (schemaProduct?.offers) {
      const offers = Array.isArray(schemaProduct.offers) ? schemaProduct.offers[0] : schemaProduct.offers;
      if (offers) {
        price = parseFloat(offers.price || offers.lowPrice || "0") || 0;
        if (offers.priceCurrency) currency = offers.priceCurrency.toUpperCase();
      }
    }
    if (!price && ogPrice) {
      price = parseFloat(ogPrice.replace(/[^0-9.]/g, "")) || 0;
    }
    if (ogCurrency) currency = ogCurrency.toUpperCase();

    if (!price) {
      const priceEls = doc.querySelectorAll(".price-item--regular, .price-item--sale, .product__price, [data-product-price], .price");
      for (const el of priceEls) {
        const txt = (el as HTMLElement).innerText || "";
        if (txt.includes("₫") || txt.includes("đ") || txt.includes("VND")) currency = "VND";
        else if (txt.includes("$") || txt.includes("USD")) currency = "USD";
        else if (txt.includes("¥") || txt.includes("￥")) currency = "CNY";
        const val = parseFloat(txt.replace(/[^0-9.,]/g, "").replace(",", "."));
        if (!isNaN(val) && val > 0) {
          price = val;
          break;
        }
      }
    }

    const shopName = schemaProduct?.brand?.name || ogSiteName || window.location.hostname;

    return {
      url,
      title,
      images: images.slice(0, 15),
      price: price || 22.95,
      currency: currency || "USD",
      shopName,
      description: schemaProduct?.description || ogDesc || "",
      variants: domVariants
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

export function useProductExtractor() {
  const [product, setProduct] = useState<Raw1688Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const lastProcessedUrlRef = useRef<string>("");

  const extractByCustomUrl = async (inputUrl: string) => {
    const cleanUrl = inputUrl.trim();
    if (!cleanUrl || (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://"))) {
      setError("Vui lòng nhập đường dẫn URL hợp lệ (bắt đầu bằng https://)");
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentUrl(cleanUrl);

    try {
      const prevRes = await apiFetch("/api/v1/clone/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl })
      });
      const prevData = await prevRes.json();
      if (prevData?.success && prevData?.preview) {
        setProduct(convertClonePreviewToRawProduct(prevData.preview, cleanUrl));
        setError(null);
      } else {
        setError(prevData?.error || "Không thể bóc tách sản phẩm từ URL này. Vui lòng kiểm tra lại link.");
      }
    } catch (e: any) {
      setError(`Lỗi kết nối máy chủ: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductData = async (force: boolean = false) => {
    setLoading(true);
    setError(null);

    // 1. Môi trường Chrome Extension
    if (typeof chrome !== "undefined" && chrome.tabs) {
      try {
        const tab = await findActiveWebTab();

        if (tab?.url) {
          const tabUrl = tab.url;
          setCurrentUrl(tabUrl);

          // Tránh gọi lại nhiều lần nếu URL không đổi (trừ khi force = true)
          if (!force && tabUrl === lastProcessedUrlRef.current && product) {
            setLoading(false);
            return;
          }
          lastProcessedUrlRef.current = tabUrl;

          // Kiểm tra URL hệ thống trình duyệt
          if (tabUrl.startsWith("chrome://") || tabUrl.startsWith("edge://") || tabUrl.startsWith("about:") || tabUrl.startsWith("chrome-extension://")) {
            setProduct(null);
            setError("Vui lòng mở một trang web sản phẩm (Macorner, Taobao, 1688, Shopee...) để bắt đầu.");
            setLoading(false);
            return;
          }

          // [Chiến lược 1]: Gọi Backend AI Cloner Preview (Cực mạnh, hỗ trợ Macorner, Taobao, 1688, Shopee, v.v.)
          try {
            const prevRes = await apiFetch("/api/v1/clone/preview", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: tabUrl })
            });
            const prevData = await prevRes.json();
            if (prevData?.success && prevData?.preview && prevData.preview.originalTitle) {
              setProduct(convertClonePreviewToRawProduct(prevData.preview, tabUrl));
              setError(null);
              setLoading(false);
              return;
            }
          } catch (beErr) {
            console.warn("[Sidepanel] Backend preview attempt failed:", beErr);
          }

          // [Chiến lược 2]: Trích xuất trực tiếp DOM trang web qua chrome.scripting.executeScript
          if (tab.id && chrome.scripting) {
            try {
              const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: extractCommerceProductFromDom
              });
              const domData = results?.[0]?.result;
              if (domData && domData.title && domData.title.length > 2) {
                const domProd = convertDomDataToRawProduct(domData, tabUrl);
                setProduct(domProd);
                setError(null);
                setLoading(false);
                return;
              }
            } catch (injErr) {
              console.warn("[Sidepanel] DOM injection extraction warning:", injErr);
            }
          }

          // [Chiến lược 3]: Gửi tin nhắn cho Content Script chuyên dụng
          if (tab.id) {
            try {
              const response = await new Promise<any>((resolve) => {
                chrome.tabs.sendMessage(tab.id!, { action: "EXTRACT_CURRENT_PRODUCT" }, (res) => {
                  if (chrome.runtime.lastError) resolve(null);
                  else resolve(res);
                });
              });

              if (response?.success && response.data?.title) {
                setProduct(response.data);
                setError(null);
                setLoading(false);
                return;
              }
            } catch {}
          }

          // [Chiến lược 4]: Kiểm tra nếu là trang chủ / danh mục Macorner
          if (tabUrl.includes("macorner.co") && !tabUrl.includes("/products/")) {
            setProduct(null);
            setError("Bạn đang ở trang chủ hoặc danh mục Macorner. Vui lòng bấm vào một sản phẩm cụ thể để quét, hoặc dán link sản phẩm vào ô bên trên.");
            setLoading(false);
            return;
          }

          // [Chiến lược 5]: Fallback 1688 mock nếu đang trên 1688
          if (tabUrl.includes("1688.com")) {
            setProduct(getMock1688Product());
            setLoading(false);
            return;
          }

          setProduct(null);
          setError("Chưa nhận diện được sản phẩm trên trang này. Vui lòng mở trang chi tiết sản phẩm hoặc dán link sản phẩm vào ô bên trên.");
          setLoading(false);
          return;
        }
      } catch (e: any) {
        console.warn("[Sidepanel] Tab query error:", e);
      }
    }

    // 2. Fallback dữ liệu mẫu để preview test UI
    setTimeout(() => {
      setProduct(getMock1688Product());
      setLoading(false);
    }, 400);
  };

  useEffect(() => {
    fetchProductData(true);

    // Tự động lắng nghe khi người dùng chuyển Tab hoặc chuyển URL trang
    if (typeof chrome !== "undefined" && chrome.tabs) {
      const handleActivated = () => {
        fetchProductData();
      };
      const handleUpdated = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (changeInfo.status === "complete" || changeInfo.url) {
          fetchProductData();
        }
      };

      chrome.tabs.onActivated?.addListener(handleActivated);
      chrome.tabs.onUpdated?.addListener(handleUpdated);

      return () => {
        chrome.tabs.onActivated?.removeListener(handleActivated);
        chrome.tabs.onUpdated?.removeListener(handleUpdated);
      };
    }
  }, []);

  return { product, loading, error, currentUrl, refresh: () => fetchProductData(true), extractByCustomUrl };
}

function convertDomDataToRawProduct(domData: any, url: string): Raw1688Product {
  const currency = domData.currency || "USD";
  const originalPrice = domData.price || 22.95;
  const originalMin = domData.priceMin || originalPrice;
  const originalMax = domData.priceMax || originalPrice;

  // Nếu domData đã có mảng variants bóc tách được từ Shopify hoặc DOM
  if (Array.isArray(domData.variants) && domData.variants.length > 0) {
    const previewLike = {
      sourceProductId: `dom_${Date.now()}`,
      originalTitle: domData.title,
      sourcePlatform: "GENERIC_WEB",
      supplierName: domData.shopName || "Macorner",
      currency,
      originalPriceMin: originalMin,
      originalPriceMax: originalMax,
      primaryImage: domData.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800",
      galleryImages: domData.images?.slice(1) || [],
      detailImages: [],
      rawOptions: domData.options,
      rawAttributes: [
        { key: "Nguồn xuất xứ", value: domData.shopName || "Website E-commerce" },
        { key: "Phương thức scan", value: "Tự động trích xuất DOM thời gian thực" }
      ],
      variants: domData.variants.map((v: any, idx: number) => {
        let vPrice = typeof v.price === "number" ? v.price : originalPrice;
        if (vPrice >= 100 && currency === "USD") vPrice = Math.round((vPrice / 100) * 100) / 100;
        let img = v.featured_image?.src || (typeof v.featured_image === "string" ? v.featured_image : undefined);
        if (img && img.startsWith("//")) img = "https:" + img;

        return {
          skuId: String(v.id || v.sku || `SKU-${idx}`),
          name: v.title || `Biến thể ${idx + 1}`,
          option1: v.option1,
          option2: v.option2,
          option3: v.option3,
          originalPrice: vPrice,
          stock: 100,
          imageUrl: img
        };
      })
    };
    return convertClonePreviewToRawProduct(previewLike, url);
  }

  // Fallback nếu không có variants
  const minCNY = currency === "VND"
    ? Math.round((originalPrice / 3800) * 10) / 10
    : currency === "USD"
    ? Math.round(originalPrice * 7.2 * 10) / 10
    : originalPrice;

  return {
    offerId: `dom_${Date.now()}`,
    sourceUrl: url,
    title: domData.title || "Sản phẩm Web",
    sourcePlatform: "GENERIC_WEB",
    originalCurrency: currency,
    originalPriceMin: originalPrice,
    originalPriceMax: originalPrice,
    shop: {
      shopId: `shop_${Date.now()}`,
      shopName: domData.shopName || "Macorner",
      shopUrl: url,
      ratingScore: 4.9
    },
    moq: 1,
    prices: {
      minPriceCNY: minCNY || 30,
      maxPriceCNY: minCNY || 30,
      currency: "CNY"
    },
    images: domData.images?.length > 0 ? domData.images : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"],
    attributes: [
      { nameCN: "Nguồn xuất xứ", valueCN: domData.shopName || "Website E-commerce" },
      { nameCN: "Phương thức scan", valueCN: "Tự động trích xuất DOM thời gian thực" }
    ],
    skuProps: [
      {
        propId: "prop_variants",
        propNameCN: "Phân loại",
        values: [{ valueId: "val_default", valueCN: "Tiêu chuẩn (Default)" }]
      }
    ],
    skuMap: {
      val_default: {
        skuId: `sku_${Date.now()}`,
        attributes: { "Phân loại": "Tiêu chuẩn (Default)" },
        priceCNY: minCNY || 30,
        stock: 100
      }
    },
    extractedAt: new Date().toISOString()
  };
}

function convertClonePreviewToRawProduct(preview: any, url: string): Raw1688Product {
  const toCny = (p: number) => {
    if (typeof p !== "number" || isNaN(p)) return 30;
    return preview.currency === "VND"
      ? Math.round((p / 3800) * 10) / 10
      : preview.currency === "USD"
      ? Math.round(p * 7.2 * 10) / 10
      : p;
  };

  const minCNY = toCny(preview.originalPriceMin);
  const maxCNY = toCny(preview.originalPriceMax);

  const rawVariants: any[] = preview.variants || [];
  let skuProps: any[] = [];
  const skuMap: Record<string, any> = {};

  const rawOptions = preview.rawOptions || [];

  if (rawOptions.length >= 2) {
    // 2 trục thuộc tính (ví dụ: Size x Buy More Save More)
    const opt1 = rawOptions[0];
    const opt2 = rawOptions[1];

    skuProps = [
      {
        propId: "prop_1",
        propNameCN: opt1.name || "Kích thước",
        values: opt1.values.map((val: string, idx: number) => ({
          valueId: `v1_${idx}`,
          valueCN: val
        }))
      },
      {
        propId: "prop_2",
        propNameCN: opt2.name || "Quy cách",
        values: opt2.values.map((val: string, idx: number) => ({
          valueId: `v2_${idx}`,
          valueCN: val
        }))
      }
    ];

    rawVariants.forEach((v: any) => {
      const vPriceCNY = toCny(v.originalPrice);
      const skuItem = {
        skuId: v.skuId,
        attributes: {
          [opt1.name || "Kích thước"]: v.option1 || "",
          [opt2.name || "Quy cách"]: v.option2 || ""
        },
        priceCNY: vPriceCNY > 0 ? vPriceCNY : minCNY,
        stock: v.stock || 100,
        imageUrl: v.imageUrl
      };

      skuMap[v.skuId] = skuItem;
      if (v.option1 && v.option2) {
        skuMap[`${v.option1}&${v.option2}`] = skuItem;
        skuMap[`${v.option1}>${v.option2}`] = skuItem;
        skuMap[`${v.option1};${v.option2}`] = skuItem;
        skuMap[`${v.option1} ${v.option2}`] = skuItem;
        skuMap[`${v.option1}_${v.option2}`] = skuItem;
        skuMap[`${v.option1} / ${v.option2}`] = skuItem;
      }
      if (v.name) skuMap[v.name] = skuItem;
      if (v.nameVI) skuMap[v.nameVI] = skuItem;
    });
  } else if (rawOptions.length === 1) {
    // 1 trục thuộc tính (Bộ sản phẩm, Combo, Quy cách đơn)
    const opt = rawOptions[0];
    skuProps = [
      {
        propId: "prop_1",
        propNameCN: opt.name || "Phân loại",
        values: opt.values.map((val: string, idx: number) => ({
          valueId: `v_${idx}`,
          valueCN: val
        }))
      }
    ];

    rawVariants.forEach((v: any) => {
      const vPriceCNY = toCny(v.originalPrice);
      const skuItem = {
        skuId: v.skuId,
        attributes: {
          [opt.name || "Phân loại"]: v.option1 || v.nameVI || v.name
        },
        priceCNY: vPriceCNY > 0 ? vPriceCNY : minCNY,
        stock: v.stock || 100,
        imageUrl: v.imageUrl
      };

      skuMap[v.skuId] = skuItem;
      if (v.option1) skuMap[v.option1] = skuItem;
      if (v.name) skuMap[v.name] = skuItem;
      if (v.nameVI) skuMap[v.nameVI] = skuItem;
    });
  } else {
    // Không có rawOptions, kiểm tra xem variants có option1 và option2 không
    const opt1Vals = [...new Set(rawVariants.map(v => v.option1).filter(Boolean))] as string[];
    const opt2Vals = [...new Set(rawVariants.map(v => v.option2).filter(Boolean))] as string[];

    if (opt1Vals.length > 0 && opt2Vals.length > 0) {
      skuProps = [
        {
          propId: "prop_1",
          propNameCN: "Kích thước",
          values: opt1Vals.map((val, idx) => ({ valueId: `v1_${idx}`, valueCN: val }))
        },
        {
          propId: "prop_2",
          propNameCN: "Quy cách",
          values: opt2Vals.map((val, idx) => ({ valueId: `v2_${idx}`, valueCN: val }))
        }
      ];

      rawVariants.forEach((v: any) => {
        const vPriceCNY = toCny(v.originalPrice);
        const skuItem = {
          skuId: v.skuId,
          attributes: {
            "Kích thước": v.option1 || "",
            "Quy cách": v.option2 || ""
          },
          priceCNY: vPriceCNY > 0 ? vPriceCNY : minCNY,
          stock: v.stock || 100,
          imageUrl: v.imageUrl
        };

        skuMap[v.skuId] = skuItem;
        if (v.option1 && v.option2) {
          skuMap[`${v.option1}&${v.option2}`] = skuItem;
          skuMap[`${v.option1}>${v.option2}`] = skuItem;
          skuMap[`${v.option1};${v.option2}`] = skuItem;
          skuMap[`${v.option1} ${v.option2}`] = skuItem;
          skuMap[`${v.option1}_${v.option2}`] = skuItem;
          skuMap[`${v.option1} / ${v.option2}`] = skuItem;
        }
        if (v.name) skuMap[v.name] = skuItem;
      });
    } else {
      skuProps = [
        {
          propId: "prop_variants",
          propNameCN: "Phân loại",
          values: rawVariants.map((v: any) => ({
            valueId: v.skuId,
            valueCN: v.nameVI || v.name,
            imageUrl: v.imageUrl
          }))
        }
      ];

      rawVariants.forEach((v: any) => {
        const vPriceCNY = toCny(v.originalPrice);
        const skuItem = {
          skuId: v.skuId,
          attributes: { "Phân loại": v.nameVI || v.name },
          priceCNY: vPriceCNY > 0 ? vPriceCNY : minCNY,
          stock: v.stock || 100,
          imageUrl: v.imageUrl
        };

        skuMap[v.skuId] = skuItem;
        if (v.name) skuMap[v.name] = skuItem;
        if (v.nameVI) skuMap[v.nameVI] = skuItem;
      });
    }
  }

  return {
    offerId: preview.sourceProductId || `hub_${Date.now()}`,
    sourceUrl: url,
    title: preview.originalTitle || preview.translatedTitleVI,
    sourcePlatform: preview.sourcePlatform,
    originalCurrency: preview.currency,
    originalPriceMin: preview.originalPriceMin,
    originalPriceMax: preview.originalPriceMax,
    shop: {
      shopId: `shop_${preview.sourceProductId || "clone"}`,
      shopName: preview.supplierName || `${preview.sourcePlatform} Shop`,
      shopUrl: url,
      ratingScore: 4.9
    },
    moq: 1,
    prices: {
      minPriceCNY: minCNY || 30,
      maxPriceCNY: maxCNY || 45,
      currency: "CNY"
    },
    images: [
      preview.primaryImage,
      ...(preview.galleryImages?.length ? preview.galleryImages : (preview.detailImages || []).slice(0, 8))
    ].filter(Boolean),
    descriptionImages: preview.detailImages || [],
    attributes: (preview.rawAttributes || preview.attributes || []).map((a: any) => ({ nameCN: a.key, valueCN: a.value })),
    skuProps,
    skuMap,
    extractedAt: new Date().toISOString()
  };
}

function getMock1688Product(): Raw1688Product {
  return {
    offerId: "83647282933",
    sourceUrl: "https://detail.1688.com/offer/83647282933.html",
    title: "2026新款跨境爆款女士高腰弹力速干无缝瑜伽健身裤厂家直销一件代发",
    shop: {
      shopId: "shop_83647282933",
      shopName: "义乌市尚品服饰源头实力工厂",
      shopUrl: "https://shop123.1688.com",
      ratingScore: 4.9
    },
    moq: 2,
    prices: {
      minPriceCNY: 32.0,
      maxPriceCNY: 45.0,
      currency: "CNY"
    },
    images: [
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80"
    ],
    attributes: [
      { nameCN: "材质/面料", valueCN: "锦纶/氨纶 (Nylon/Spandex)" },
      { nameCN: "适用场景", valueCN: "瑜伽 / 跑步 / 健身训练" },
      { nameCN: "版型", valueCN: "高腰紧身提臀" }
    ],
    skuProps: [
      {
        propId: "prop_color",
        propNameCN: "颜色",
        values: [
          { valueId: "col_black", valueCN: "黑色" },
          { valueId: "col_pink", valueCN: "粉色" },
          { valueId: "col_white", valueCN: "白色" }
        ]
      },
      {
        propId: "prop_size",
        propNameCN: "尺码",
        values: [
          { valueId: "size_s", valueCN: "S" },
          { valueId: "size_m", valueCN: "M" },
          { valueId: "size_l", valueCN: "L" },
          { valueId: "size_xl", valueCN: "XL" }
        ]
      }
    ],
    skuMap: {
      "col_black_size_s": {
        skuId: "1688_4388991",
        attributes: { "颜色": "黑色", "尺码": "S" },
        priceCNY: 32.0,
        stock: 120
      },
      "col_black_size_m": {
        skuId: "1688_4388992",
        attributes: { "颜色": "黑色", "尺码": "M" },
        priceCNY: 32.0,
        stock: 243
      },
      "col_pink_size_m": {
        skuId: "1688_4388993",
        attributes: { "颜色": "粉色", "尺码": "M" },
        priceCNY: 34.0,
        stock: 92
      },
      "col_pink_size_l": {
        skuId: "1688_4388994",
        attributes: { "颜色": "粉色", "尺码": "L" },
        priceCNY: 34.0,
        stock: 76
      }
    },
    extractedAt: new Date().toISOString()
  };
}
