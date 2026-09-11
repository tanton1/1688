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

    const normalizeImageUrl = (value: any): string | undefined => {
      if (!value) return undefined;
      let image = String(value).trim();
      if (!image || image.startsWith("data:") || image.startsWith("blob:")) return undefined;
      if (image.startsWith("//")) image = "https:" + image;
      try { return new URL(image, window.location.href).href; } catch { return undefined; }
    };

    // Customily/third-party personalization controls are rendered as live DOM
    // image swatches and are not included in Shopify's product JSON.
    const extractCustomOptionGroups = () => {
      const groups: Array<{ name: string; values: Array<{ label: string; imageUrl?: string }> }> = [];
      const containers = Array.from(doc.querySelectorAll(
        "#custom-options .ant-form-item, .personalized-form .ant-form-item, [data-personalization] .ant-form-item"
      ));
      for (const container of containers) {
        const labelEl = container.querySelector(".ant-form-item-label label, .pb-form-item-label, [data-option-label], legend, label");
        const name = (labelEl?.getAttribute("title") || labelEl?.textContent || "").replace(/\s+/g, " ").trim();
        if (!name || (/quantity|buy more|shipping/i.test(name) && !/choose|option|design|style/i.test(name))) continue;

        const values: Array<{ label: string; imageUrl?: string }> = [];
        const swatches = Array.from(container.querySelectorAll(
          ".swatch-container .pb-tooltip, .swatch-container > div, [role=option], [role=radio], input[type=radio]"
        ));
        for (const swatch of swatches) {
          const imageEl = swatch.querySelector?.("img") as HTMLImageElement | null;
          const valueLabel = swatch.querySelector?.(".pb-tooltip-title, [data-value-label], [title], [aria-label]") as HTMLElement | null;
          const input = swatch.tagName === "INPUT" ? swatch as HTMLInputElement : null;
          const label = (
            valueLabel?.getAttribute("title") || valueLabel?.getAttribute("aria-label") || valueLabel?.textContent ||
            input?.value || swatch.getAttribute("data-value") || swatch.getAttribute("title") || swatch.textContent || ""
          ).replace(/\s+/g, " ").trim();
          let imageUrl = normalizeImageUrl(imageEl?.getAttribute("data-src") || imageEl?.getAttribute("data-original") || imageEl?.getAttribute("src"));
          if (!imageUrl) {
            const styled = (swatch.querySelector?.("[style*='background-image']") || swatch) as HTMLElement | null;
            const match = styled?.getAttribute("style")?.match(/background-image\s*:\s*url\(["']?([^"')]+)["']?\)/i);
            imageUrl = normalizeImageUrl(match?.[1]);
          }
          if (label && !values.some(value => value.label.toLowerCase() === label.toLowerCase())) values.push({ label, imageUrl });
        }
        if (values.length >= 2) groups.push({ name, values });
      }
      return groups;
    };

    // Customily mounts its swatches asynchronously after the Shopify shell.
    // Give it a short window so opening the side panel immediately still gets
    // the option images instead of returning only the native quantity SKUs.
    if (/macorner\.co$/i.test(window.location.hostname) && pathname.includes("/products/") && extractCustomOptionGroups().length === 0) {
      await new Promise<void>(resolve => {
        const observer = new MutationObserver(() => {
          if (extractCustomOptionGroups().length > 0) {
            observer.disconnect();
            resolve();
          }
        });
        observer.observe(doc.documentElement, { childList: true, subtree: true });
        window.setTimeout(() => { observer.disconnect(); resolve(); }, 2500);
      });
    }

    // 1. Thử gọi API JSON của chính Shopify store ngay trên Tab (same-origin, cực sạch và chính xác 100%)
    if (pathname.includes("/products/")) {
      try {
        const cleanPath = pathname.split("?")[0].replace(/\/$/, "");
        const res = await fetch(`${cleanPath}.js`);
        if (res.ok) {
          const shopifyData = await res.json();
          if (shopifyData && (shopifyData.title || (Array.isArray(shopifyData.variants) && shopifyData.variants.length > 0))) {
            const imageMap: Record<number, string> = {};
            const cleanImages: string[] = (shopifyData.images || []).map((img: any) => {
              let s = typeof img === "string" ? img : img?.src || "";
              if (s.startsWith("//")) s = "https:" + s;
              if (typeof img === "object" && img?.id && s) {
                imageMap[img.id] = s;
              }
              return s;
            }).filter(Boolean);

            const normalizePrice = (p: number) => {
              if (typeof p !== "number" || !Number.isFinite(p) || p <= 0) return 0;
              return p >= 100 ? Math.round((p / 100) * 100) / 100 : p;
            };

            const rawVariants = (shopifyData.variants || []).map((v: any) => {
              let img = v.featured_image?.src || (typeof v.featured_image === "string" ? v.featured_image : undefined);
              if (!img && v.image_id && imageMap[v.image_id]) {
                img = imageMap[v.image_id];
              }
              if (img && img.startsWith("//")) img = "https:" + img;
              return {
                ...v,
                featured_image: img ? { src: img } : undefined
              };
            });

            const customGroups = extractCustomOptionGroups();
            const shopifyOptions = (Array.isArray(shopifyData.options) ? shopifyData.options : [])
              .map((option: any, index: number) => ({
                name: String(typeof option === "string" ? option : (option?.name || `Option ${index + 1}`)).trim(),
                values: Array.isArray(option?.values)
                  ? option.values.map((value: any) => String(value).trim()).filter(Boolean)
                  : [...new Set(rawVariants.map((variant: any) => variant[`option${index + 1}`]).filter(Boolean).map((value: any) => String(value).trim()))]
              }))
              .filter((option: any) => option.values.length > 0);
            const baseOptionNames = new Set(shopifyOptions.map((option: any) => option.name.toLowerCase()));
            const uniqueCustomGroups = customGroups.filter(group => !baseOptionNames.has(group.name.toLowerCase()));

            // Shopify owns price/stock for quantity packs; the personalization
            // app owns the design image. Combine both into selectable variants.
            let mergedVariants = rawVariants;
            if (uniqueCustomGroups.length > 0 && rawVariants.length > 0) {
              const customCombinations = uniqueCustomGroups.reduce(
                (combinations: Array<{ values: string[]; imageUrl?: string }>, group: any) => combinations.flatMap(combo =>
                  group.values.map((value: any) => ({
                    values: [...combo.values, value.label],
                    imageUrl: value.imageUrl || combo.imageUrl
                  }))
                ),
                [{ values: [], imageUrl: undefined }]
              ).slice(0, 5000);
              mergedVariants = rawVariants.flatMap((base: any) => customCombinations.map((combo, index) => ({
                ...base,
                id: `${base.id}__custom_${index}_${combo.values.map((value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-")).join("-")}`,
                sku: base.sku ? `${base.sku}__${combo.values.join("-")}` : undefined,
                title: [base.title || base.option1, ...combo.values].filter(Boolean).join(" / "),
                option1: base.option1,
                option2: combo.values[0] || undefined,
                option3: combo.values[1] || undefined,
                featured_image: combo.imageUrl ? { src: combo.imageUrl } : base.featured_image
              })));
            }
            const mergedOptions = [
              ...shopifyOptions,
              ...uniqueCustomGroups.map(group => ({ name: group.name, values: group.values.map(value => value.label) }))
            ];
            const customImages = uniqueCustomGroups.flatMap(group => group.values.map(value => value.imageUrl).filter(Boolean));

            // Trích xuất hình ảnh mô tả chi tiết từ Shopify description / body_html
            const detailImages: string[] = [];
            const descHtml = shopifyData.body_html || shopifyData.description || "";
            if (descHtml) {
              const imgMatches = descHtml.match(/<img\b[^>]*\b(?:src|data-src)=["']((?:https?:)?\/\/[^"'\s>]+)["'][^>]*>/gi);
              if (imgMatches) {
                imgMatches.forEach((m: string) => {
                  const srcMatch = m.match(/(?:src|data-src)=["']((?:https?:)?\/\/[^"'\s>]+)["']/i);
                  if (srcMatch) {
                    let u = srcMatch[1].trim();
                    if (u.startsWith("//")) u = "https:" + u;
                    if (!detailImages.includes(u)) detailImages.push(u);
                  }
                });
              }
            }

            const prices = rawVariants.map((v: any) => normalizePrice(v.price)).filter((price: number) => price > 0);
            const priceMin = prices.length > 0 ? Math.min(...prices) : normalizePrice(shopifyData.price);
            const priceMax = prices.length > 0 ? Math.max(...prices) : priceMin;
            const productImages = [...new Set([
              ...(cleanImages.length > 0 ? cleanImages : [normalizeImageUrl(shopifyData.featured_image)]),
              ...customImages
            ].filter(Boolean))] as string[];

            if (!shopifyData.title?.trim() || productImages.length === 0 || priceMin <= 0) {
              return { error: "EXTRACTION_FAILED: Shopify JSON thiếu tiêu đề, ảnh hoặc giá xác thực" };
            }

            return {
              url,
              sourceProductId: String(shopifyData.id || shopifyData.handle || cleanPath),
              title: shopifyData.title,
              images: productImages,
              detailImages,
              price: priceMin,
              priceMin,
              priceMax,
              currency: "USD",
              shopName: shopifyData.vendor || window.location.hostname,
              description: shopifyData.description || "",
              options: mergedOptions,
              variants: mergedVariants
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

    // Trích xuất hình ảnh mô tả DOM (Detail Images)
    const domDetailImages: string[] = [];
    doc.querySelectorAll(".product__description img, .rte img, #description img, .description img, [class*='description'] img, .product-description img").forEach((img: any) => {
      let s = img.getAttribute("data-src") || img.getAttribute("data-lazyload-src") || img.getAttribute("data-original") || img.src;
      if (s) {
        if (s.startsWith("//")) s = "https:" + s;
        if (!JUNK_IMG_REGEX.test(s) && !domDetailImages.includes(s)) domDetailImages.push(s);
      }
    });

    if (!title || title.length < 3 || images.length === 0 || price <= 0) {
      return { error: "EXTRACTION_FAILED: DOM thiếu tiêu đề, ảnh hoặc giá xác thực" };
    }

    const pathId = pathname.split("/").filter(Boolean).pop() || window.location.hostname;
    return {
      url,
      sourceProductId: String(schemaProduct?.sku || pathId).slice(0, 128),
      title,
      images: images.slice(0, 15),
      detailImages: domDetailImages,
      price,
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
      if (prevData?.success && prevData?.preview?.extractionStatus === "LIVE" && !prevData.preview.isDemo) {
        setProduct(convertClonePreviewToRawProduct(prevData.preview, cleanUrl));
        setError(null);
      } else {
        setProduct(null);
        setError(prevData?.error || "EXTRACTION_UNVERIFIED: Dữ liệu từ URL chưa đủ tin cậy để nhập.");
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

          // [Ưu tiên 1]: Gửi tin nhắn trực tiếp cho Content Script chuyên dụng trên Tab hiện tại
          // Content script chạy ngay trong trang web người dùng đang xem (có cookie, DOM đầy đủ, không bị anti-bot chặn)
          if (tab.id) {
            try {
              const response = await new Promise<any>((resolve) => {
                chrome.tabs.sendMessage(tab.id!, { action: "EXTRACT_CURRENT_PRODUCT" }, (res) => {
                  if (chrome.runtime.lastError) resolve(null);
                  else resolve(res);
                });
              });

              if (response?.success && response.data?.title && (response.data.images?.length > 0 || response.data.skuProps?.length > 0)) {
                console.log("[Sidepanel] Bóc tách thành công qua Content Script:", response.data);
                setProduct(response.data);
                setError(null);
                setLoading(false);
                return;
              }
            } catch (csErr) {
              console.warn("[Sidepanel] Content script direct message attempt:", csErr);
            }
          }

          // [Ưu tiên 2]: Trích xuất trực tiếp DOM trang web qua chrome.scripting.executeScript
          if (tab.id && chrome.scripting) {
            try {
              const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: extractCommerceProductFromDom
              });
              const domData = results?.[0]?.result;
              if (domData && !domData.error && domData.title?.length > 2 && domData.images?.length > 0 && Number(domData.price) > 0) {
                console.log("[Sidepanel] Bóc tách thành công qua DOM injection:", domData);
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

          // [Ưu tiên 3]: Gọi Backend AI Cloner Preview (Dành cho dán link ngoài hoặc tab bị hạn chế)
          try {
            const prevRes = await apiFetch("/api/v1/clone/preview", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: tabUrl })
            });
            const prevData = await prevRes.json();
            if (prevData?.success && prevData?.preview?.extractionStatus === "LIVE" && !prevData.preview.isDemo && prevData.preview.originalTitle) {
              console.log("[Sidepanel] Bóc tách thành công qua Backend Preview:", prevData.preview);
              setProduct(convertClonePreviewToRawProduct(prevData.preview, tabUrl));
              setError(null);
              setLoading(false);
              return;
            }
          } catch (beErr) {
            console.warn("[Sidepanel] Backend preview attempt failed:", beErr);
          }

          // [Kiểm tra đặc biệt]: Trang chủ / danh mục Macorner
          if (tabUrl.includes("macorner.co") && !tabUrl.includes("/products/")) {
            setProduct(null);
            setError("Bạn đang ở trang chủ hoặc danh mục Macorner. Vui lòng bấm vào một sản phẩm cụ thể để quét, hoặc dán link sản phẩm vào ô bên trên.");
            setLoading(false);
            return;
          }

          setProduct(null);
          setError("EXTRACTION_FAILED: Không lấy được dữ liệu thật. Hãy mở đúng trang chi tiết sản phẩm rồi thử lại.");
          setLoading(false);
          return;
        }
      } catch (e: any) {
        console.warn("[Sidepanel] Tab query error:", e);
      }
    }

    setProduct(null);
    setError("EXTRACTION_FAILED: Không có trang sản phẩm hợp lệ để trích xuất.");
    setLoading(false);
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
  const originalPrice = Number(domData.price) || 0;
  const originalMin = domData.priceMin || originalPrice;
  const originalMax = domData.priceMax || originalPrice;
  const images = Array.isArray(domData.images) ? domData.images.filter(Boolean) : [];
  if (!domData.title?.trim() || images.length === 0 || originalMin <= 0) {
    throw new Error("EXTRACTION_FAILED: DOM thiếu tiêu đề, ảnh hoặc giá xác thực");
  }
  const parsedUrl = new URL(url);
  const pathId = parsedUrl.pathname.split("/").filter(Boolean).pop() || parsedUrl.hostname;
  const sourceProductId = String(domData.sourceProductId || pathId).slice(0, 128);
  const supplierName = domData.shopName || parsedUrl.hostname;
  const verifiedVariants = Array.isArray(domData.variants)
    ? domData.variants.filter((variant: any) => (variant.id || variant.sku) && (Number(variant.price) > 0 || originalPrice > 0))
    : [];

  // Nếu domData đã có mảng variants bóc tách được từ Shopify hoặc DOM
  if (verifiedVariants.length > 0) {
    const previewLike = {
      sourceProductId,
      originalTitle: domData.title,
      sourcePlatform: "GENERIC_WEB",
      supplierName,
      currency,
      originalPriceMin: originalMin,
      originalPriceMax: originalMax,
      primaryImage: images[0],
      galleryImages: images.slice(1),
      detailImages: domData.detailImages || [],
      rawOptions: domData.options,
      extractionStatus: "LIVE",
      isDemo: false,
      rawAttributes: [
        { key: "Nguồn xuất xứ", value: supplierName },
        { key: "Phương thức scan", value: "Tự động trích xuất DOM thời gian thực" }
      ],
      variants: verifiedVariants.map((v: any) => {
        let vPrice = Number(v.price) > 0 ? Number(v.price) : originalPrice;
        if (vPrice >= 100 && currency === "USD") vPrice = Math.round((vPrice / 100) * 100) / 100;
        let img = v.imageUrl || v.featured_image?.src || (typeof v.featured_image === "string" ? v.featured_image : undefined);
        if (img && img.startsWith("//")) img = "https:" + img;

        return {
          skuId: String(v.id || v.sku),
          name: v.title || [v.option1, v.option2, v.option3].filter(Boolean).join(" / ") || String(v.id || v.sku),
          option1: v.option1,
          option2: v.option2,
          option3: v.option3,
          originalPrice: vPrice,
          stock: Number.isFinite(v.inventory_quantity) ? Math.max(0, Math.trunc(v.inventory_quantity)) : 0,
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
    offerId: sourceProductId,
    sourceUrl: url,
    title: domData.title,
    sourcePlatform: "GENERIC_WEB",
    originalCurrency: currency,
    originalPriceMin: originalPrice,
    originalPriceMax: originalPrice,
    shop: {
      shopId: `shop_${sourceProductId}`,
      shopName: supplierName,
      shopUrl: parsedUrl.origin
    },
    moq: 1,
    prices: {
      minPriceCNY: minCNY,
      maxPriceCNY: minCNY,
      currency: "CNY"
    },
    images,
    descriptionImages: domData.detailImages || [],
    attributes: [
      { nameCN: "Nguồn xuất xứ", valueCN: supplierName },
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
        skuId: `sku_${sourceProductId}_default`,
        attributes: { "Phân loại": "Tiêu chuẩn (Default)" },
        priceCNY: minCNY,
        stock: 0
      }
    },
    extractedAt: new Date().toISOString()
  };
}

function convertClonePreviewToRawProduct(preview: any, url: string): Raw1688Product {
  if (preview?.isDemo || preview?.extractionStatus !== "LIVE") {
    throw new Error("EXTRACTION_UNVERIFIED: Chỉ dữ liệu LIVE mới được chuyển sang luồng nhập hàng");
  }
  const sourceProductId = String(preview.sourceProductId || "").trim();
  const title = String(preview.originalTitle || preview.translatedTitleVI || "").trim();
  const images = [
    preview.primaryImage,
    ...(preview.galleryImages?.length ? preview.galleryImages : (preview.detailImages || []).slice(0, 8))
  ].filter(Boolean);
  if (!sourceProductId || title.length < 3 || images.length === 0 || Number(preview.originalPriceMin) <= 0) {
    throw new Error("EXTRACTION_FAILED: Preview thiếu ID, tiêu đề, ảnh hoặc giá xác thực");
  }

  const toCny = (p: number) => {
    if (typeof p !== "number" || !Number.isFinite(p) || p <= 0) return 0;
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
        stock: v.stock ?? 0,
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
        stock: v.stock ?? 0,
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
          stock: v.stock ?? 0,
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
          stock: v.stock ?? 0,
          imageUrl: v.imageUrl
        };

        skuMap[v.skuId] = skuItem;
        if (v.name) skuMap[v.name] = skuItem;
        if (v.nameVI) skuMap[v.nameVI] = skuItem;
      });
    }
  }

  if (Object.keys(skuMap).length === 0) {
    const defaultSkuId = `sku_${sourceProductId}_default`;
    skuProps = [{
      propId: "prop_variants",
      propNameCN: "Phân loại",
      values: [{ valueId: defaultSkuId, valueCN: "Tiêu chuẩn" }]
    }];
    skuMap[defaultSkuId] = {
      skuId: defaultSkuId,
      attributes: { "Phân loại": "Tiêu chuẩn" },
      priceCNY: minCNY,
      stock: 0,
      imageUrl: images[0]
    };
  }

  return {
    offerId: sourceProductId,
    sourceUrl: url,
    title,
    sourcePlatform: preview.sourcePlatform,
    originalCurrency: preview.currency,
    originalPriceMin: preview.originalPriceMin,
    originalPriceMax: preview.originalPriceMax,
    shop: {
      shopId: `shop_${sourceProductId}`,
      shopName: preview.supplierName || new URL(url).hostname,
      shopUrl: new URL(url).origin
    },
    moq: 1,
    prices: {
      minPriceCNY: minCNY,
      maxPriceCNY: maxCNY || minCNY,
      currency: "CNY"
    },
    images,
    descriptionImages: preview.detailImages || [],
    attributes: (preview.rawAttributes || preview.attributes || []).map((a: any) => ({ nameCN: a.key, valueCN: a.value })),
    skuProps,
    skuMap,
    extractedAt: new Date().toISOString()
  };
}
